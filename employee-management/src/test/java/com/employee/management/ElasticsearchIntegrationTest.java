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
import com.employee.management.service.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "elasticsearch.index.employees=test_es_it_employees",
        "elasticsearch.index.users=test_es_it_users",
        "elasticsearch.index.user_emails=test_es_it_user_emails",
        "elasticsearch.index.mutation_journal=test_es_it_mutation_journal"
})
class ElasticsearchIntegrationTest {

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
    private EmployeeService employeeService;

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
    private String adminRecordId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // Clean up
        for (String email : new String[]{"admin.es@test.com", "emp.es@test.com", "sarah.c@test.com",
                "batch1@test.com", "batch2@test.com", "resilient@test.com"}) {
            esEmailReservationRepository.deleteReservationUnconditional(email);
            esUserRepository.findByEmail(email).ifPresent(u -> esUserRepository.deleteById(u.getId()));
            esEmployeeRepository.findByEmail(email).ifPresent(e -> esEmployeeRepository.deleteById(e.getId()));
        }

        // Create Admin User
        adminUserUuid = UUID.randomUUID().toString();
        String adminOpId = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail("admin.es@test.com", adminUserUuid, adminOpId);
        esUserRepository.saveUser(new UserDocument(
                adminUserUuid, "admin.es@test.com",
                passwordEncoder.encode("AdminPass123!"),
                Role.ROLE_ADMIN, LocalDateTime.now(), adminOpId, 1L,
                Collections.singletonList(adminOpId), null
        ));

        // Create Employee User
        empUserUuid = UUID.randomUUID().toString();
        String empUserOpId = UUID.randomUUID().toString();
        esEmailReservationRepository.reserveEmail("emp.es@test.com", empUserUuid, empUserOpId);
        esUserRepository.saveUser(new UserDocument(
                empUserUuid, "emp.es@test.com",
                passwordEncoder.encode("EmpPass123!"),
                Role.ROLE_EMP, LocalDateTime.now(), empUserOpId, 1L,
                Collections.singletonList(empUserOpId), null
        ));

        // Create employee linked to empUser
        empRecordId = UUID.randomUUID().toString();
        String empEmpOpId = UUID.randomUUID().toString();
        esEmployeeRepository.saveEmployee(new EmployeeDocument(
                empRecordId, "Employee One", "emp.es@test.com", "DevOps",
                new BigDecimal("70000.00"), "1112223333",
                LocalDateTime.now(), LocalDateTime.now(),
                empUserUuid, empEmpOpId, 1L, Collections.singletonList(empEmpOpId), null
        ));

        // Create employee linked to admin
        adminRecordId = UUID.randomUUID().toString();
        String adminEmpOpId = UUID.randomUUID().toString();
        esEmployeeRepository.saveEmployee(new EmployeeDocument(
                adminRecordId, "Admin Manager", "admin.es@test.com", "Leadership",
                new BigDecimal("120000.00"), "9998887777",
                LocalDateTime.now(), LocalDateTime.now(),
                adminUserUuid, adminEmpOpId, 1L, Collections.singletonList(adminEmpOpId), null
        ));

        UserDetails adminDetails = userDetailsService.loadUserByUsername("admin.es@test.com");
        adminToken = jwtService.generateToken(adminDetails);

        UserDetails empDetails = userDetailsService.loadUserByUsername("emp.es@test.com");
        empToken = jwtService.generateToken(empDetails);
    }

    @Test
    @DisplayName("1. Employee creation is searchable via keyword")
    void employeeCreation_IndexesIntoElasticsearch() throws Exception {
        EmployeeDto newEmp = new EmployeeDto(
                null, "Sarah Connor", "sarah.c@test.com", "Cyber Security",
                88000.0, "5554443322", null, null
        );

        mockMvc.perform(post("/api/employees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newEmp)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Sarah Connor"));

        mockMvc.perform(get("/api/employees?keyword=Sarah")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Sarah Connor"));
    }

    @Test
    @DisplayName("2. Employee update synchronizes changes to Elasticsearch index")
    void employeeUpdate_SynchronizesToElasticsearch() throws Exception {
        EmployeeDto updateDto = new EmployeeDto(
                empRecordId, "Employee One Renamed", "emp.es@test.com", "Cloud Architecture",
                75000.0, "1112223333", null, null
        );

        mockMvc.perform(put("/api/employees/" + empRecordId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Employee One Renamed"));

        mockMvc.perform(get("/api/employees?keyword=Cloud")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Employee One Renamed"));
    }

    @Test
    @DisplayName("3. Employee deletion removes document from Elasticsearch index")
    void employeeDeletion_RemovesFromElasticsearch() throws Exception {
        mockMvc.perform(delete("/api/employees/" + empRecordId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        assertFalse(esEmployeeRepository.findById(empRecordId).isPresent());
    }

    @Test
    @DisplayName("4. Search matches across name, email, and department")
    void searchMatches_AcrossMultipleFields() throws Exception {
        mockMvc.perform(get("/api/employees?keyword=Leadership")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Admin Manager"));

        mockMvc.perform(get("/api/employees?keyword=emp.es")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Employee One"));
    }

    @Test
    @DisplayName("5. Search pagination works correctly")
    void searchPagination_Works() throws Exception {
        // Create 2 extra employees in same department
        for (int i = 1; i <= 2; i++) {
            String batchEmail = "batch" + i + "@test.com";
            String batchId = UUID.randomUUID().toString();
            String batchOpId = UUID.randomUUID().toString();
            esEmployeeRepository.saveEmployee(new EmployeeDocument(
                    batchId, "SearchBatch " + i, batchEmail, "DevOps",
                    new BigDecimal("60000.00"), "12345678" + i,
                    LocalDateTime.now(), LocalDateTime.now(),
                    null, batchOpId, 1L, Collections.singletonList(batchOpId), null
            ));
        }

        mockMvc.perform(get("/api/employees?keyword=DevOps&page=0&size=2")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(3)));
    }

    @Test
    @DisplayName("6. Salary masking enforced on search results")
    void salaryMasking_EnforcedOnSearch() throws Exception {
        // Admin sees all salaries
        mockMvc.perform(get("/api/employees?keyword=es@test.com")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.email == 'admin.es@test.com')].salary").value(contains(120000.0)))
                .andExpect(jsonPath("$.content[?(@.email == 'emp.es@test.com')].salary").value(contains(70000.0)));

        // Employee sees own salary, peer salary masked
        mockMvc.perform(get("/api/employees?keyword=es@test.com")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.email == 'emp.es@test.com')].salary").value(contains(70000.0)))
                .andExpect(jsonPath("$.content[?(@.email == 'admin.es@test.com')].salary").value(contains((Object) null)));
    }

    @Test
    @DisplayName("7. Obsolete sync-index endpoint has been removed (POST is method not allowed)")
    void syncIndexEndpoint_RemovedMethodNotAllowed() throws Exception {
        mockMvc.perform(post("/api/employees/sync-index")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("8. Employee email uniqueness is strictly enforced on create")
    void employeeEmailUniqueness_EnforcedOnCreate() {
        String testEmail = "unique_emp_" + UUID.randomUUID() + "@test.com";
        EmployeeDto dto1 = new EmployeeDto(
                null, "First Worker", testEmail, "Engineering",
                80000.0, "1112223333", null, null
        );
        EmployeeDto created = employeeService.createEmployee(dto1);
        assertNotNull(created.id());

        // Attempt duplicate employee create with same email
        EmployeeDto dto2 = new EmployeeDto(
                null, "Duplicate Worker", testEmail, "Marketing",
                70000.0, "4445556666", null, null
        );
        assertThrows(IllegalArgumentException.class, () -> employeeService.createEmployee(dto2));

        employeeService.deleteEmployee(created.id());
    }

    @Test
    @DisplayName("9. Employee CRUD using service layer works end-to-end")
    void serviceLevelCrud_WorksEndToEnd() {
        EmployeeDto dto = new EmployeeDto(
                null, "Resilient Worker", "resilient@test.com", "Engineering",
                95000.0, "1231231234", null, null
        );

        EmployeeDto created = employeeService.createEmployee(dto);
        assertNotNull(created.id());
        assertTrue(esEmployeeRepository.findById(created.id()).isPresent());

        Page<EmployeeDto> search = employeeService.searchEmployees("Resilient", PageRequest.of(0, 10), "admin.es@test.com", true);
        assertNotNull(search);

        employeeService.deleteEmployee(created.id());
        assertFalse(esEmployeeRepository.findById(created.id()).isPresent());
    }
}
