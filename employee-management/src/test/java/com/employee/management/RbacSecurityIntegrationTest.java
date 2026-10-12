package com.employee.management;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.document.UserDocument;
import com.employee.management.dto.EmployeeDto;
import com.employee.management.enums.Role;
import com.employee.management.repository.es.EsEmailReservationRepository;
import com.employee.management.repository.es.EsEmployeeRepository;
import com.employee.management.repository.es.EsUserRepository;
import com.employee.management.security.CustomUserDetailsService;
import com.employee.management.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "elasticsearch.index.employees=test_rbac_employees",
        "elasticsearch.index.users=test_rbac_users",
        "elasticsearch.index.user_emails=test_rbac_user_emails",
        "elasticsearch.index.mutation_journal=test_rbac_mutation_journal"
})
class RbacSecurityIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @Autowired
    private EsUserRepository esUserRepository;

    @Autowired
    private EsEmployeeRepository esEmployeeRepository;

    @Autowired
    private EsEmailReservationRepository esEmailReservationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private String adminToken;
    private String empToken;
    private String adminUserUuid;
    private String empUserUuid;
    private String empRecordId;
    private String otherRecordId;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // Clean up any previous test data
        esEmailReservationRepository.deleteReservationUnconditional("admin@test.com");
        esEmailReservationRepository.deleteReservationUnconditional("john.emp@test.com");
        esEmailReservationRepository.deleteReservationUnconditional("registrant@test.com");
        esEmailReservationRepository.deleteReservationUnconditional("alice@test.com");
        esEmailReservationRepository.deleteReservationUnconditional("unlinked.emp@test.com");

        esUserRepository.findByEmail("admin@test.com").ifPresent(u -> esUserRepository.deleteById(u.getId()));
        esUserRepository.findByEmail("john.emp@test.com").ifPresent(u -> esUserRepository.deleteById(u.getId()));
        esUserRepository.findByEmail("registrant@test.com").ifPresent(u -> esUserRepository.deleteById(u.getId()));
        esUserRepository.findByEmail("alice@test.com").ifPresent(u -> esUserRepository.deleteById(u.getId()));
        esUserRepository.findByEmail("unlinked.emp@test.com").ifPresent(u -> esUserRepository.deleteById(u.getId()));

        esEmployeeRepository.findByEmail("admin@test.com").ifPresent(e -> esEmployeeRepository.deleteById(e.getId()));
        esEmployeeRepository.findByEmail("john.emp@test.com").ifPresent(e -> esEmployeeRepository.deleteById(e.getId()));
        esEmployeeRepository.findByEmail("registrant@test.com").ifPresent(e -> esEmployeeRepository.deleteById(e.getId()));
        esEmployeeRepository.findByEmail("alice@test.com").ifPresent(e -> esEmployeeRepository.deleteById(e.getId()));
        esEmployeeRepository.findByEmail("unlinked.emp@test.com").ifPresent(e -> esEmployeeRepository.deleteById(e.getId()));

        // 1. Create Admin User in Elasticsearch
        adminUserUuid = UUID.randomUUID().toString();
        String adminOpId = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail("admin@test.com", adminUserUuid, adminOpId);
        UserDocument adminDoc = new UserDocument(
                adminUserUuid, "admin@test.com",
                passwordEncoder.encode("AdminPass123!"),
                Role.ROLE_ADMIN, LocalDateTime.now(), adminOpId, 1L,
                Collections.singletonList(adminOpId), null
        );
        esUserRepository.saveUser(adminDoc);

        // 2. Create Regular Employee User in Elasticsearch
        empUserUuid = UUID.randomUUID().toString();
        String empUserOpId = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail("john.emp@test.com", empUserUuid, empUserOpId);
        UserDocument empUserDoc = new UserDocument(
                empUserUuid, "john.emp@test.com",
                passwordEncoder.encode("EmpPass123!"),
                Role.ROLE_EMP, LocalDateTime.now(), empUserOpId, 1L,
                Collections.singletonList(empUserOpId), null
        );
        esUserRepository.saveUser(empUserDoc);

        // 3. Create linked employee record for empUser
        empRecordId = UUID.randomUUID().toString();
        String empEmpOpId = UUID.randomUUID().toString();
        EmployeeDocument empEmpDoc = new EmployeeDocument(
                empRecordId, "John Doe", "john.emp@test.com", "Engineering",
                new BigDecimal("75000.00"), "1234567890",
                LocalDateTime.now(), LocalDateTime.now(),
                empUserUuid, empEmpOpId, 1L, Collections.singletonList(empEmpOpId), null
        );
        esEmployeeRepository.saveEmployee(empEmpDoc);

        // 4. Create another employee record (unlinked - no userId)
        otherRecordId = UUID.randomUUID().toString();
        String otherOpId = UUID.randomUUID().toString();
        EmployeeDocument otherDoc = new EmployeeDocument(
                otherRecordId, "Alice Smith", "alice@test.com", "HR",
                new BigDecimal("90000.00"), "9876543210",
                LocalDateTime.now(), LocalDateTime.now(),
                null, otherOpId, 1L, Collections.singletonList(otherOpId), null
        );
        esEmployeeRepository.saveEmployee(otherDoc);

        // Generate tokens
        UserDetails adminDetails = userDetailsService.loadUserByUsername("admin@test.com");
        adminToken = jwtService.generateToken(adminDetails);

        UserDetails empDetails = userDetailsService.loadUserByUsername("john.emp@test.com");
        empToken = jwtService.generateToken(empDetails);
    }

    @Test
    @DisplayName("1. Unauthenticated request to protected endpoints should return 401")
    void unauthenticatedRequest_Returns401() throws Exception {
        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("2. Public registration must ignore role parameter and strictly assign ROLE_EMP")
    void publicRegistration_AlwaysAssignsRoleEmp() throws Exception {
        String registrationPayload = """
                {
                    "email": "registrant@test.com",
                    "password": "SecretPass123!",
                    "role": "ROLE_ADMIN"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registrationPayload))
                .andExpect(status().isCreated());

        UserDocument savedUser = esUserRepository.findByEmail("registrant@test.com").orElseThrow();
        assertEquals(Role.ROLE_EMP, savedUser.getRole(), "User role must be strictly ROLE_EMP");
    }

    @Test
    @DisplayName("3. ROLE_EMP can view employee directory and search")
    void roleEmp_CanViewDirectoryAndSearch() throws Exception {
        mockMvc.perform(get("/api/employees")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/employees?keyword=John")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("4. ROLE_EMP cannot create an employee record (returns 403)")
    void roleEmp_CannotCreateEmployee_Returns403() throws Exception {
        EmployeeDto dto = new EmployeeDto(
                null, "Bob Jones", "bob@test.com", "Marketing",
                60000.0, "1234567890", null, null
        );

        mockMvc.perform(post("/api/employees")
                        .header("Authorization", "Bearer " + empToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. ROLE_EMP cannot delete an employee record (returns 403)")
    void roleEmp_CannotDeleteEmployee_Returns403() throws Exception {
        mockMvc.perform(delete("/api/employees/" + otherRecordId)
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. ROLE_EMP cannot update another employee record (returns 403)")
    void roleEmp_CannotUpdateOtherEmployee_Returns403() throws Exception {
        EmployeeDto updateDto = new EmployeeDto(
                otherRecordId, "Hacked Alice", "alice@test.com", "HR",
                120000.0, "9876543210", null, null
        );

        mockMvc.perform(put("/api/employees/" + otherRecordId)
                        .header("Authorization", "Bearer " + empToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("7. ROLE_EMP can update their own profile, but cannot escalate salary")
    void roleEmp_CanUpdateOwnProfile_SalaryCannotBeEscalated() throws Exception {
        EmployeeDto updateDto = new EmployeeDto(
                empRecordId, "Johnny Doe", "john.emp@test.com", "Platform Engineering",
                999999.0, "1234567890", null, null
        );

        mockMvc.perform(put("/api/employees/" + empRecordId)
                        .header("Authorization", "Bearer " + empToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Johnny Doe"))
                .andExpect(jsonPath("$.department").value("Platform Engineering"))
                .andExpect(jsonPath("$.salary").value(75000.0)); // Unchanged
    }

    @Test
    @DisplayName("8. ROLE_EMP can fetch their own profile via /api/employees/me")
    void roleEmp_CanFetchOwnProfile() throws Exception {
        mockMvc.perform(get("/api/employees/me")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("john.emp@test.com"));
    }

    @Test
    @DisplayName("9. ROLE_ADMIN can create, update any, and delete employee records")
    void roleAdmin_HasFullCrudAccess() throws Exception {
        EmployeeDto newDto = new EmployeeDto(
                null, "David Lee", "david@test.com", "Finance",
                85000.0, "1122334455", null, null
        );

        String createResponse = mockMvc.perform(post("/api/employees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("David Lee"))
                .andReturn().getResponse().getContentAsString();

        EmployeeDto created = objectMapper.readValue(createResponse, EmployeeDto.class);

        EmployeeDto updateDto = new EmployeeDto(
                created.id(), "David Lee Updated", created.email(), "Finance",
                95000.0, created.phone(), created.createdAt(), null
        );
        mockMvc.perform(put("/api/employees/" + created.id())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(95000.0))
                .andExpect(jsonPath("$.name").value("David Lee Updated"));

        mockMvc.perform(delete("/api/employees/" + created.id())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("10. ROLE_EMP salary masking: peer salary null, own salary visible")
    void roleEmp_SalaryMaskedForPeers_VisibleForSelf() throws Exception {
        mockMvc.perform(get("/api/employees/" + otherRecordId)
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(nullValue()));

        mockMvc.perform(get("/api/employees/" + empRecordId)
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(75000.0));

        mockMvc.perform(get("/api/employees/me")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(75000.0));
    }

    @Test
    @DisplayName("11. ROLE_ADMIN can view all employee salaries")
    void roleAdmin_CanViewAllSalaries() throws Exception {
        mockMvc.perform(get("/api/employees/" + otherRecordId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(90000.0));

        mockMvc.perform(get("/api/employees/" + empRecordId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(75000.0));
    }

    @Test
    @DisplayName("12. Unlinked employee (no userId) is not treated as owned")
    void unlinkedEmployee_IsNotOwned_SalaryMasked() throws Exception {
        // Create user with no employee link
        String unlinkedUserUuid = UUID.randomUUID().toString();
        String unlinkedOpId = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail("unlinked.emp@test.com", unlinkedUserUuid, unlinkedOpId);
        UserDocument unlinkedUser = new UserDocument(
                unlinkedUserUuid, "unlinked.emp@test.com",
                passwordEncoder.encode("SecretPass123!"),
                Role.ROLE_EMP, LocalDateTime.now(), unlinkedOpId, 1L,
                Collections.singletonList(unlinkedOpId), null
        );
        esUserRepository.saveUser(unlinkedUser);

        // Create unlinked employee with matching email but userId=null
        String unlinkedEmpId = UUID.randomUUID().toString();
        String unlinkedEmpOpId = UUID.randomUUID().toString();
        EmployeeDocument unlinkedEmp = new EmployeeDocument(
                unlinkedEmpId, "Unlinked Worker", "unlinked.emp@test.com", "Operations",
                new BigDecimal("85000.00"), "5556667777",
                LocalDateTime.now(), LocalDateTime.now(),
                null, unlinkedEmpOpId, 1L, Collections.singletonList(unlinkedEmpOpId), null
        );
        esEmployeeRepository.saveEmployee(unlinkedEmp);

        UserDetails unlinkedDetails = userDetailsService.loadUserByUsername("unlinked.emp@test.com");
        String unlinkedToken = jwtService.generateToken(unlinkedDetails);

        // Salary must be masked (userId does not match)
        mockMvc.perform(get("/api/employees/" + unlinkedEmpId)
                        .header("Authorization", "Bearer " + unlinkedToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(nullValue()));

        // Update must be forbidden (not the owner)
        EmployeeDto updateAttempt = new EmployeeDto(
                unlinkedEmpId, "Hacked Worker", "unlinked.emp@test.com",
                "Operations", 150000.0, "5556667777", null, null
        );
        mockMvc.perform(put("/api/employees/" + unlinkedEmpId)
                        .header("Authorization", "Bearer " + unlinkedToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateAttempt)))
                .andExpect(status().isForbidden());

        // Admin can see salary
        mockMvc.perform(get("/api/employees/" + unlinkedEmpId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(85000.0));
    }

    @Test
    @DisplayName("13. Login endpoint returns correct role strings")
    void loginEndpoint_ReturnsCorrectRoleStrings() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.com\",\"password\":\"AdminPass123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.email").value("admin@test.com"))
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"john.emp@test.com\",\"password\":\"EmpPass123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.role").value("ROLE_EMP"));
    }

    @Test
    @DisplayName("14. Elasticsearch role lookup reads Role enum values correctly")
    void elasticsearchRoleMapping_PersistsAndReadsRoleEnumCorrectly() {
        UserDocument adminUser = esUserRepository.findByEmail("admin@test.com").orElseThrow();
        assertEquals(Role.ROLE_ADMIN, adminUser.getRole());

        UserDocument empUser = esUserRepository.findByEmail("john.emp@test.com").orElseThrow();
        assertEquals(Role.ROLE_EMP, empUser.getRole());
    }
}
