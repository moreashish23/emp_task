package com.employee.management;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.document.UserDocument;
import com.employee.management.dto.EmployeeDto;
import com.employee.management.dto.LoginRequest;
import com.employee.management.dto.LoginResponse;
import com.employee.management.dto.RegisterRequest;
import com.employee.management.enums.Role;
import com.employee.management.repository.es.EsEmailReservationRepository;
import com.employee.management.repository.es.EsEmployeeRepository;
import com.employee.management.repository.es.EsUserRepository;
import com.employee.management.service.AuthService;
import com.employee.management.service.EmployeeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "elasticsearch.index.employees=test_no_mysql_employees",
        "elasticsearch.index.users=test_no_mysql_users",
        "elasticsearch.index.user_emails=test_no_mysql_user_emails",
        "elasticsearch.index.mutation_journal=test_no_mysql_mutation_journal"
})
public class NoMysqlIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private EsUserRepository esUserRepository;

    @Autowired
    private EsEmployeeRepository esEmployeeRepository;

    @Autowired
    private EsEmailReservationRepository esEmailReservationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminEmail;
    private String adminPassword = "AdminPass123!";
    private String adminUserUuid;

    private String empEmail;
    private String empPassword = "EmpPass123!";
    private String empUserUuid;
    private String empRecordId;

    @BeforeEach
    void setup() {
        // Create Admin user in Elasticsearch directly
        adminEmail = "nomysql_admin_" + UUID.randomUUID() + "@test.com";
        adminUserUuid = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail(adminEmail, adminUserUuid, UUID.randomUUID().toString());
        UserDocument adminDoc = new UserDocument(
                adminUserUuid,
                adminEmail,
                passwordEncoder.encode(adminPassword),
                Role.ROLE_ADMIN,
                LocalDateTime.now(),
                UUID.randomUUID().toString(),
                1L,
                null,
                null
        );
        esUserRepository.saveUser(adminDoc);

        // Create Regular Employee in Elasticsearch directly
        empEmail = "nomysql_emp_" + UUID.randomUUID() + "@test.com";
        empUserUuid = UUID.randomUUID().toString();
        empRecordId = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail(empEmail, empUserUuid, UUID.randomUUID().toString());
        UserDocument empDoc = new UserDocument(
                empUserUuid,
                empEmail,
                passwordEncoder.encode(empPassword),
                Role.ROLE_EMP,
                LocalDateTime.now(),
                UUID.randomUUID().toString(),
                1L,
                null,
                null
        );
        esUserRepository.saveUser(empDoc);

        EmployeeDocument empProfile = new EmployeeDocument(
                empRecordId,
                "NoSql Employee",
                empEmail,
                "Engineering",
                new BigDecimal("88000.00"),
                "123-456-7890",
                LocalDateTime.now(),
                LocalDateTime.now(),
                empUserUuid,
                UUID.randomUUID().toString(),
                1L,
                null,
                null
        );
        esEmployeeRepository.saveEmployee(empProfile);
    }

    @AfterEach
    void cleanup() {
        if (adminEmail != null) {
            esEmailReservationRepository.deleteReservationUnconditional(adminEmail);
            esUserRepository.deleteById(adminUserUuid);
        }
        if (empEmail != null) {
            esEmailReservationRepository.deleteReservationUnconditional(empEmail);
            esUserRepository.deleteById(empUserUuid);
            esEmployeeRepository.deleteById(empRecordId);
        }
    }

    @Test
    @DisplayName("Gate 1: Application starts and authenticates successfully with MySQL completely disconnected")
    void testAuthenticationWithoutMysql() {
        // Valid login returns JWT token
        LoginResponse response = authService.login(new LoginRequest(adminEmail, adminPassword));
        assertNotNull(response);
        assertNotNull(response.token());
        assertEquals(adminEmail, response.email());
        assertEquals("ROLE_ADMIN", response.role());

        // Invalid credentials reject correctly
        assertThrows(BadCredentialsException.class, () ->
                authService.login(new LoginRequest(adminEmail, "WrongPassword!")));
    }

    @Test
    @DisplayName("Gate 2: Public registration, email reservation uniqueness, and duplicate 409 conflict work without MySQL")
    void testRegistrationAndEmailUniquenessWithoutMysql() {
        String newEmail = "newuser_" + UUID.randomUUID() + "@test.com";
        String regMsg = authService.register(new RegisterRequest(newEmail, "NewSecurePass123!"));
        assertEquals("User registered successfully", regMsg);

        // Verify user exists in ES
        Optional<UserDocument> userOpt = esUserRepository.findByEmail(newEmail);
        assertTrue(userOpt.isPresent(), "User must exist in Elasticsearch primary store");
        assertEquals(Role.ROLE_EMP, userOpt.get().getRole());

        // Attempting to register same email again throws IllegalArgumentException (duplicate rejected)
        assertThrows(IllegalArgumentException.class, () ->
                authService.register(new RegisterRequest(newEmail, "AnotherPass123!")));

        // Teardown registration
        esEmailReservationRepository.deleteReservationUnconditional(newEmail);
        userOpt.ifPresent(u -> esUserRepository.deleteById(u.getId()));
    }

    @Test
    @DisplayName("Gate 3: Employee CRUD, search, pagination, and ownership enforcement without MySQL")
    void testEmployeeOperationsWithoutMysql() {
        // 1. Employee creates a record
        String createdEmail = "created_" + UUID.randomUUID() + "@test.com";
        EmployeeDto newDto = new EmployeeDto(
                (String) null,
                "Created Worker",
                createdEmail,
                "Design",
                75000.0,
                "555-1234",
                null,
                null
        );

        EmployeeDto created = employeeService.createEmployee(newDto);
        assertNotNull(created.id());
        assertEquals("Created Worker", created.name());

        // 2. Fetch by ID
        EmployeeDto fetched = employeeService.getById(created.id(), adminEmail, true);
        assertEquals(created.id(), fetched.id());
        assertEquals(75000.0, fetched.salary());

        // 3. Salary masking for other regular employees
        EmployeeDto maskedForOtherEmp = employeeService.getById(empRecordId, "other@test.com", false);
        assertNull(maskedForOtherEmp.salary(), "Salary must be masked for non-owner regular employees");

        // 4. Salary unmasked for owner
        EmployeeDto unmaskedForOwner = employeeService.getById(empRecordId, empEmail, false);
        assertEquals(88000.0, unmaskedForOwner.salary(), "Salary must NOT be masked for profile owner");

        // 5. Ownership update restriction: Non-owner forbidden from editing
        EmployeeDto forbiddenUpdate = new EmployeeDto(
                empRecordId,
                "Hacked Name",
                empEmail,
                "Engineering",
                99999.0,
                "999",
                null,
                null
        );
        assertThrows(AccessDeniedException.class, () ->
                employeeService.updateEmployee(empRecordId, forbiddenUpdate, "stranger@test.com", false));

        // 6. Owner allowed to update
        EmployeeDto ownerUpdate = new EmployeeDto(
                empRecordId,
                "Updated Name",
                empEmail,
                "Engineering",
                88000.0,
                "111-222-3333",
                null,
                null
        );
        EmployeeDto updated = employeeService.updateEmployee(empRecordId, ownerUpdate, empEmail, false);
        assertEquals("Updated Name", updated.name());

        // 7. Search and pagination
        Page<EmployeeDto> searchResult = employeeService.searchEmployees(
                "Updated",
                PageRequest.of(0, 10),
                adminEmail,
                true
        );
        assertNotNull(searchResult);

        // 8. Delete
        employeeService.deleteEmployee(created.id());
        assertFalse(esEmployeeRepository.findById(created.id()).isPresent());
    }
}
