package com.employee.management.repository.es;

import com.employee.management.document.EmailReservationDocument;
import com.employee.management.document.EmployeeDocument;
import com.employee.management.document.MutationJournalDocument;
import com.employee.management.document.UserDocument;
import com.employee.management.enums.JournalState;
import com.employee.management.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class EsInfrastructureIntegrationTest {

    @Autowired
    private EsEmailReservationRepository emailReservationRepository;

    @Autowired
    private EsMutationJournalRepository mutationJournalRepository;

    @Autowired
    private EsUserRepository userRepository;

    @Autowired
    private EsEmployeeRepository employeeRepository;

    @Test
    @DisplayName("Email reservation enforces uniqueness and rejects concurrent duplicate with 409")
    void testEmailReservationUniqueness() {
        String testEmail = "unique_test_" + UUID.randomUUID() + "@example.com";
        String user1 = UUID.randomUUID().toString();
        String op1 = UUID.randomUUID().toString();

        String user2 = UUID.randomUUID().toString();
        String op2 = UUID.randomUUID().toString();

        // First reservation succeeds
        boolean firstReserved = emailReservationRepository.reserveEmail(testEmail, user1, op1);
        assertTrue(firstReserved, "First reservation must succeed");

        // Duplicate reservation with same email fails (returns false due to 409 conflict)
        boolean duplicateReserved = emailReservationRepository.reserveEmail(testEmail, user2, op2);
        assertFalse(duplicateReserved, "Concurrent/duplicate reservation with same email must fail");

        // Verify reservation exists
        Optional<EmailReservationDocument> res = emailReservationRepository.getReservation(testEmail);
        assertTrue(res.isPresent());
        assertEquals(user1, res.get().getUserId());

        // Cleanup: foreign delete fails
        boolean foreignDeleted = emailReservationRepository.deleteReservationIfOwned(testEmail, user2, op2);
        assertFalse(foreignDeleted, "Alien deletion attempt must fail");
        assertTrue(emailReservationRepository.getReservation(testEmail).isPresent(), "Reservation must remain intact");

        // Owner delete succeeds
        boolean ownerDeleted = emailReservationRepository.deleteReservationIfOwned(testEmail, user1, op1);
        assertTrue(ownerDeleted, "Owner deletion must succeed");
        assertTrue(emailReservationRepository.getReservation(testEmail).isEmpty());
    }

    @Test
    @DisplayName("Mutation journal tracks state transitions and sequences")
    void testMutationJournalStateTransitions() {
        String opId = UUID.randomUUID().toString();
        String entityId = UUID.randomUUID().toString();

        MutationJournalDocument pending = mutationJournalRepository.recordPending(
                opId,
                "EMPLOYEE",
                entityId,
                1L,
                "CREATE",
                "{\"name\":\"Test\"}",
                null
        );

        assertNotNull(pending);
        assertEquals(JournalState.PENDING, pending.getState());
        assertNotNull(pending.getJournalSeq());

        // Verify retrieval
        Optional<MutationJournalDocument> fetched = mutationJournalRepository.findById(opId);
        assertTrue(fetched.isPresent());
        assertEquals(JournalState.PENDING, fetched.get().getState());

        // Transition to COMMITTED
        mutationJournalRepository.markCommitted(opId);
        Optional<MutationJournalDocument> committed = mutationJournalRepository.findById(opId);
        assertTrue(committed.isPresent());
        assertEquals(JournalState.COMMITTED, committed.get().getState());
        assertNotNull(committed.get().getCommittedAt());

        // Check sequential retrieval
        List<MutationJournalDocument> committedList = mutationJournalRepository.findCommittedSinceSeq(pending.getJournalSeq() - 1, 50);
        assertTrue(committedList.stream().anyMatch(d -> d.getOpId().equals(opId)));
    }

    @Test
    @DisplayName("UserDocument CRUD works with UUID IDs and Role enum in Elasticsearch")
    void testUserDocumentCrud() {
        String userId = UUID.randomUUID().toString();
        String email = "es_user_" + UUID.randomUUID() + "@example.com";

        UserDocument user = new UserDocument(
                userId,
                email,
                "$2a$10$N9qo8uLOickgx2ZMRZoMye.I.O52gXv2j1pYF9lU6wM6aK1zL3h5i",
                Role.ROLE_ADMIN,
                LocalDateTime.now(),
                "op-init",
                1L,
                Collections.singletonList("op-init"),
                null
        );

        userRepository.saveUser(user);

        Optional<UserDocument> fetched = userRepository.findById(userId);
        assertTrue(fetched.isPresent());
        assertEquals(email, fetched.get().getEmail());
        assertEquals(Role.ROLE_ADMIN, fetched.get().getRole());

        Optional<UserDocument> byEmail = userRepository.findByEmail(email);
        assertTrue(byEmail.isPresent());
        assertEquals(userId, byEmail.get().getId());

        userRepository.deleteById(userId);
        assertTrue(userRepository.findById(userId).isEmpty());
    }

    @Test
    @DisplayName("EmployeeDocument preserves BigDecimal salary precision with 2 decimal places and supports search")
    void testEmployeeDocumentCrudAndSalaryPrecision() {
        String empId = UUID.randomUUID().toString();
        String userUuid = UUID.randomUUID().toString();
        String email = "es_emp_" + UUID.randomUUID() + "@example.com";
        BigDecimal rawSalary = new BigDecimal("85000.755"); // should scale to 85000.76

        EmployeeDocument employee = new EmployeeDocument(
                empId,
                "Dr. Jane Matrix",
                email,
                "Cybernetics",
                rawSalary,
                "555-0199",
                LocalDateTime.now(),
                LocalDateTime.now(),
                userUuid,
                "op-1",
                1L,
                Collections.singletonList("op-1"),
                101L
        );

        employeeRepository.saveEmployee(employee);

        Optional<EmployeeDocument> fetched = employeeRepository.findById(empId);
        assertTrue(fetched.isPresent());
        EmployeeDocument saved = fetched.get();

        // Verify salary rounding and equality
        assertNotNull(saved.getSalary());
        assertEquals(new BigDecimal("85000.76"), saved.getSalary());
        assertEquals(0, new BigDecimal("85000.76").compareTo(saved.getSalary()));

        // Lookup by user UUID
        Optional<EmployeeDocument> byUser = employeeRepository.findByUserId(userUuid);
        assertTrue(byUser.isPresent());
        assertEquals(empId, byUser.get().getId());

        // Search by keyword
        Page<EmployeeDocument> searchRes = employeeRepository.search("Cybernetics", PageRequest.of(0, 10));
        assertTrue(searchRes.getTotalElements() > 0);
        assertTrue(searchRes.getContent().stream().anyMatch(e -> e.getId().equals(empId)));

        employeeRepository.deleteById(empId);
        assertTrue(employeeRepository.findById(empId).isEmpty());
    }
}
