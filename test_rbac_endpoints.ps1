# RBAC Security Automated Verification Script (All Phase 7 Scenarios)
$baseUrl = "http://localhost:5000/api"
$script:results = @()

function Record-Test($name, $passed, $details) {
    $script:results += [PSCustomObject]@{
        TestName = $name
        Status   = if ($passed) { "PASSED" } else { "FAILED" }
        Details  = $details
    }
    $color = if ($passed) { "Green" } else { "Red" }
    Write-Host "[$($script:results[-1].Status)] $name : $details" -ForegroundColor $color
}

function Invoke-ApiRequest {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    $reqHeaders = @{}
    foreach ($k in $Headers.Keys) { $reqHeaders[$k] = $Headers[$k] }
    if ($Body -and -not $reqHeaders.ContainsKey("Content-Type")) {
        $reqHeaders["Content-Type"] = "application/json"
    }

    try {
        if ($Body) {
            $resp = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $reqHeaders -Body $Body
        } else {
            $resp = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $reqHeaders
        }
        return @{ StatusCode = 200; Data = $resp; Error = $null }
    } catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        return @{ StatusCode = $statusCode; Data = $null; Error = $_.Exception.Message }
    }
}

Write-Host "`n=== 1. Testing Unauthenticated Access (Must return 401) ===" -ForegroundColor Cyan
$unauthGet = Invoke-ApiRequest -Uri "$baseUrl/employees" -Method "Get"
$unauthPost = Invoke-ApiRequest -Uri "$baseUrl/employees" -Method "Post" -Body "{}"
if ($unauthGet.StatusCode -eq 401 -and $unauthPost.StatusCode -eq 401) {
    Record-Test "Unauthenticated requests return 401" $true "GET /api/employees and POST /api/employees returned 401"
} else {
    Record-Test "Unauthenticated requests return 401" $false "GET: $($unauthGet.StatusCode), POST: $($unauthPost.StatusCode)"
}

Write-Host "`n=== 2. Testing Public Registration (Escalation Prevention) ===" -ForegroundColor Cyan
$empEmail = "employee_sec_$(Get-Random)@example.com"
$regPayload = @{
    email    = $empEmail
    password = "Password123!"
    role     = "ROLE_ADMIN" # Malicious client attempt to elevate privilege
} | ConvertTo-Json

$regRes = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method "Post" -Body $regPayload
$regOk = ($regRes.StatusCode -eq 200 -or $regRes.StatusCode -eq 201)

# Now log in with newly created credentials and inspect the authoritative role returned by backend
$loginPayload = @{
    email    = $empEmail
    password = "Password123!"
} | ConvertTo-Json

$loginRes = Invoke-ApiRequest -Uri "$baseUrl/auth/login" -Method "Post" -Body $loginPayload
$empToken = if ($loginRes.Data) { $loginRes.Data.token } else { "" }
$loginRole = if ($loginRes.Data) { $loginRes.Data.role } else { "" }

if ($regOk -and $loginRole -eq "ROLE_EMP") {
    Record-Test "Public registration always creates ROLE_EMP" $true "Registration succeeded (201/200) and verified role is strictly 'ROLE_EMP' (ROLE_ADMIN was rejected)"
} else {
    Record-Test "Public registration always creates ROLE_EMP" $false "Role was: '$loginRole'"
}

$empHeaders = @{
    Authorization = "Bearer $empToken"
}

Write-Host "`n=== 3. Testing ROLE_EMP Directory & Search Access with Pagination ===" -ForegroundColor Cyan
$dirRes = Invoke-ApiRequest -Uri "$baseUrl/employees?page=0&size=10" -Method "Get" -Headers $empHeaders
if ($dirRes.StatusCode -eq 200 -and $dirRes.Data) {
    Record-Test "ROLE_EMP can view directory with pagination" $true "HTTP 200, Total elements: $($dirRes.Data.totalElements)"
} else {
    Record-Test "ROLE_EMP can view directory with pagination" $false "Status: $($dirRes.StatusCode)"
}

$searchRes = Invoke-ApiRequest -Uri "$baseUrl/employees?keyword=employee&page=0&size=10" -Method "Get" -Headers $empHeaders
if ($searchRes.StatusCode -eq 200) {
    Record-Test "ROLE_EMP can search employees" $true "HTTP 200, Total matches: $($searchRes.Data.totalElements)"
} else {
    Record-Test "ROLE_EMP can search employees" $false "Status: $($searchRes.StatusCode)"
}

Write-Host "`n=== 4. Testing Creation Prevention for ROLE_EMP (Must return 403) ===" -ForegroundColor Cyan
$newEmpPayload = @{
    name       = "Malicious Employee"
    email      = "hack_$(Get-Random)@example.com"
    department = "IT"
    salary     = 99999
    phone      = "1234567890"
} | ConvertTo-Json

$createRes = Invoke-ApiRequest -Uri "$baseUrl/employees" -Method "Post" -Headers $empHeaders -Body $newEmpPayload
if ($createRes.StatusCode -eq 403) {
    Record-Test "ROLE_EMP cannot create employee (403 Forbidden)" $true "HTTP 403 Forbidden received"
} else {
    Record-Test "ROLE_EMP cannot create employee (403 Forbidden)" $false "Received status: $($createRes.StatusCode)"
}

Write-Host "`n=== 5. Testing Self-Profile Retrieval (GET /api/employees/me) ===" -ForegroundColor Cyan
$meRes = Invoke-ApiRequest -Uri "$baseUrl/employees/me" -Method "Get" -Headers $empHeaders
$myEmpRecord = $meRes.Data
if ($meRes.StatusCode -eq 200 -and $myEmpRecord) {
    Record-Test "ROLE_EMP can fetch own profile (/me)" $true "HTTP 200, Profile ID: $($myEmpRecord.id), Email: $($myEmpRecord.email)"
} else {
    Record-Test "ROLE_EMP can fetch own profile (/me)" $false "Status: $($meRes.StatusCode)"
}

Write-Host "`n=== 6. Testing Deletion Prevention for ROLE_EMP (Must return 403) ===" -ForegroundColor Cyan
$targetDelId = if ($myEmpRecord) { $myEmpRecord.id } else { 1 }
$delRes = Invoke-ApiRequest -Uri "$baseUrl/employees/$targetDelId" -Method "Delete" -Headers $empHeaders
if ($delRes.StatusCode -eq 403) {
    Record-Test "ROLE_EMP cannot delete employee (403 Forbidden)" $true "HTTP 403 Forbidden received"
} else {
    Record-Test "ROLE_EMP cannot delete employee (403 Forbidden)" $false "Received status: $($delRes.StatusCode)"
}

Write-Host "`n=== 7. Testing IDOR Prevention (ROLE_EMP updating other employee ID) ===" -ForegroundColor Cyan
$otherId = 999999
$hackedPayload = @{
    name       = "Hacked Name"
    email      = "victim@example.com"
    department = "Finance"
    salary     = 1000000
    phone      = "9876543210"
} | ConvertTo-Json

$idorRes = Invoke-ApiRequest -Uri "$baseUrl/employees/$otherId" -Method "Put" -Headers $empHeaders -Body $hackedPayload
if ($idorRes.StatusCode -eq 403 -or $idorRes.StatusCode -eq 404) {
    Record-Test "ROLE_EMP cannot update other employee record" $true "Access denied/prevented (Status: $($idorRes.StatusCode))"
} else {
    Record-Test "ROLE_EMP cannot update other employee record" $false "Received status: $($idorRes.StatusCode)"
}

Write-Host "`n=== 8. Testing Own Profile Update & Salary Tamper Prevention ===" -ForegroundColor Cyan
if ($myEmpRecord) {
    $originalSalary = $myEmpRecord.salary
    $updatePayload = @{
        id         = $myEmpRecord.id
        name       = "Updated Name"
        email      = $myEmpRecord.email
        department = "Engineering"
        salary     = 9999999 # Attempted salary inflation
        phone      = "1122334455"
    } | ConvertTo-Json

    $updateRes = Invoke-ApiRequest -Uri "$baseUrl/employees/$($myEmpRecord.id)" -Method "Put" -Headers $empHeaders -Body $updatePayload
    if ($updateRes.StatusCode -eq 200 -and $updateRes.Data) {
        $savedSalary = $updateRes.Data.salary
        $salaryProtected = ($savedSalary -eq $originalSalary)
        Record-Test "ROLE_EMP can update own profile" $true "Name updated to: $($updateRes.Data.name)"
        Record-Test "ROLE_EMP cannot alter salary (Tamper Prevention)" $salaryProtected "Original salary: $originalSalary, Saved salary: $savedSalary"
    } else {
        Record-Test "ROLE_EMP can update own profile" $false "Status: $($updateRes.StatusCode)"
    }
}

Write-Host "`n=== 9. Provisioning and Testing ROLE_ADMIN Full Capabilities ===" -ForegroundColor Cyan
# 1. Register a trusted admin candidate
$adminEmail = "trusted_admin_$(Get-Random)@example.com"
$adminPassword = "AdminSecretPass123!"
$adminRegPayload = @{
    email    = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

$null = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method "Post" -Body $adminRegPayload

# 2. Promote through trusted database administrative process
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$promoteSql = "UPDATE employee_management_task.users SET role = 'ROLE_ADMIN' WHERE email = '$adminEmail';"
& $mysqlPath -u root -pAshish@12345 -e $promoteSql 2>$null

# 3. Log in as newly promoted ROLE_ADMIN
$adminLoginPayload = @{
    email    = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

$adminLoginRes = Invoke-ApiRequest -Uri "$baseUrl/auth/login" -Method "Post" -Body $adminLoginPayload
$adminToken = if ($adminLoginRes.Data) { $adminLoginRes.Data.token } else { "" }
$adminRole = if ($adminLoginRes.Data) { $adminLoginRes.Data.role } else { "" }

if ($adminRole -eq "ROLE_ADMIN" -and -not [string]::IsNullOrEmpty($adminToken)) {
    Record-Test "ROLE_ADMIN login succeeded" $true "Admin authenticated with role: $adminRole"

    $adminHeaders = @{
        Authorization = "Bearer $adminToken"
    }

    # Admin creates an employee
    $adminNewEmpPayload = @{
        name       = "Admin Created Staff"
        email      = "staff_$(Get-Random)@example.com"
        department = "Operations"
        salary     = 85000
        phone      = "9876543210"
    } | ConvertTo-Json

    $adminCreateRes = Invoke-ApiRequest -Uri "$baseUrl/employees" -Method "Post" -Headers $adminHeaders -Body $adminNewEmpPayload
    $createdStaff = $adminCreateRes.Data

    if ($createdStaff -and $createdStaff.id) {
        Record-Test "ROLE_ADMIN can create employees" $true "Employee created with ID #$($createdStaff.id)"

        # Admin updates employee (including salary adjustment)
        $adminUpdatePayload = @{
            id         = $createdStaff.id
            name       = "Admin Created Staff (Promoted)"
            email      = $createdStaff.email
            department = "Operations"
            salary     = 95000 # Admin is allowed to adjust salary
            phone      = "9876543210"
        } | ConvertTo-Json

        $adminUpdateRes = Invoke-ApiRequest -Uri "$baseUrl/employees/$($createdStaff.id)" -Method "Put" -Headers $adminHeaders -Body $adminUpdatePayload
        if ($adminUpdateRes.StatusCode -eq 200 -and $adminUpdateRes.Data.salary -eq 95000) {
            Record-Test "ROLE_ADMIN can update employee & adjust salary" $true "Salary updated to: $($adminUpdateRes.Data.salary)"
        } else {
            Record-Test "ROLE_ADMIN can update employee & adjust salary" $false "Status: $($adminUpdateRes.StatusCode)"
        }

        # Admin deletes employee
        $adminDeleteRes = Invoke-ApiRequest -Uri "$baseUrl/employees/$($createdStaff.id)" -Method "Delete" -Headers $adminHeaders
        if ($adminDeleteRes.StatusCode -eq 200) {
            Record-Test "ROLE_ADMIN can delete employee" $true "Employee #$($createdStaff.id) deleted successfully"
        } else {
            Record-Test "ROLE_ADMIN can delete employee" $false "Status: $($adminDeleteRes.StatusCode)"
        }
    } else {
        Record-Test "ROLE_ADMIN can create employees" $false "Status: $($adminCreateRes.StatusCode)"
    }
} else {
    Record-Test "ROLE_ADMIN login succeeded" $false "Status: $($adminLoginRes.StatusCode), Role: $adminRole"
}

Write-Host "`n=== Complete Summary of Test Results ===" -ForegroundColor Cyan
$script:results | Format-Table -AutoSize
