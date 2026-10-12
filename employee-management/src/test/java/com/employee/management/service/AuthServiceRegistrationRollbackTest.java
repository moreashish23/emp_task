package com.employee.management.service;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.document.UserDocument;
import com.employee.management.dto.RegisterRequest;
import com.employee.management.repository.es.EsEmailReservationRepository;
import com.employee.management.repository.es.EsEmployeeRepository;
import com.employee.management.repository.es.EsMutationJournalRepository;
import com.employee.management.repository.es.EsUserRepository;
import com.employee.management.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegistrationRollbackTest {

    @Mock
    private EsUserRepository esUserRepository;

    @Mock
    private EsEmployeeRepository esEmployeeRepository;

    @Mock
    private EsEmailReservationRepository emailReservationRepository;

    @Mock
    private EsMutationJournalRepository journalRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                esUserRepository,
                esEmployeeRepository,
                emailReservationRepository,
                journalRepository,
                passwordEncoder,
                authenticationManager,
                jwtService
        );
    }

    @Test
    @DisplayName("1. User save failure triggers reservation cleanup and journal failure")
    void testUserSaveFailureRollsBackReservation() {
        when(emailReservationRepository.reserveEmail(eq("rollback1@test.com"), anyString(), anyString()))
                .thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        doThrow(new RuntimeException("ES cluster unavailable"))
                .when(esUserRepository).saveUser(any(UserDocument.class));

        RegisterRequest request = new RegisterRequest("rollback1@test.com", "Password123!");
        assertThrows(RuntimeException.class, () -> authService.register(request));

        verify(journalRepository).markFailed(anyString(), contains("ES cluster unavailable"));
        verify(emailReservationRepository, atLeastOnce()).deleteReservationIfOwned(eq("rollback1@test.com"), anyString(), anyString());
        verify(esEmployeeRepository, never()).saveEmployee(any());
    }

    @Test
    @DisplayName("2. Employee save failure triggers user deletion, journal failure, and reservation cleanup")
    void testEmployeeSaveFailureRollsBackUserAndReservation() {
        when(emailReservationRepository.reserveEmail(eq("rollback2@test.com"), anyString(), anyString()))
                .thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        when(esEmployeeRepository.findByEmail(eq("rollback2@test.com"))).thenReturn(Optional.empty());
        doThrow(new RuntimeException("Employee ES indexing failed"))
                .when(esEmployeeRepository).saveEmployee(any(EmployeeDocument.class));

        RegisterRequest request = new RegisterRequest("rollback2@test.com", "Password123!");
        assertThrows(RuntimeException.class, () -> authService.register(request));

        // Verifies user document was cleaned up/deleted
        verify(esUserRepository).deleteById(anyString());
        verify(journalRepository).markFailed(anyString(), contains("Employee ES indexing failed"));
        verify(emailReservationRepository, atLeastOnce()).deleteReservationIfOwned(eq("rollback2@test.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("3. Conflicting existing employee linked to foreign user triggers user deletion and reservation cleanup")
    void testConflictingEmployeeLinkRollsBackUserAndReservation() {
        when(emailReservationRepository.reserveEmail(eq("conflict@test.com"), anyString(), anyString()))
                .thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");

        EmployeeDocument existingForeignEmp = new EmployeeDocument(
                "emp-1", "Foreign", "conflict@test.com", "Eng",
                BigDecimal.valueOf(5000), "123456",
                LocalDateTime.now(), LocalDateTime.now(),
                "foreign-user-id", "op-0", 1L, null, null
        );
        when(esEmployeeRepository.findByEmail(eq("conflict@test.com"))).thenReturn(Optional.of(existingForeignEmp));

        RegisterRequest request = new RegisterRequest("conflict@test.com", "Password123!");
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("already linked to another user account"));

        // Verifies user document was cleaned up/deleted
        verify(esUserRepository).deleteById(anyString());
        verify(journalRepository).markFailed(anyString(), contains("already linked"));
        verify(emailReservationRepository, atLeastOnce()).deleteReservationIfOwned(eq("conflict@test.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("4. Reservation failure rejects registration immediately without touching user or employee")
    void testReservationConflictRejectsEarly() {
        when(emailReservationRepository.reserveEmail(eq("existing@test.com"), anyString(), anyString()))
                .thenReturn(false);

        RegisterRequest request = new RegisterRequest("existing@test.com", "Password123!");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("User already exists"));

        verify(esUserRepository, never()).saveUser(any());
        verify(esEmployeeRepository, never()).saveEmployee(any());
        verify(journalRepository, never()).recordPending(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("5. Transient failure during reservation cleanup retries up to 3 times")
    void testReservationCleanupRetriesOnFailure() {
        when(emailReservationRepository.reserveEmail(eq("retry@test.com"), anyString(), anyString()))
                .thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        doThrow(new RuntimeException("Save failed"))
                .when(esUserRepository).saveUser(any(UserDocument.class));

        // First attempt throws, second succeeds
        when(emailReservationRepository.deleteReservationIfOwned(eq("retry@test.com"), anyString(), anyString()))
                .thenThrow(new RuntimeException("Network hiccup"))
                .thenReturn(true);

        RegisterRequest request = new RegisterRequest("retry@test.com", "Password123!");
        assertThrows(RuntimeException.class, () -> authService.register(request));

        verify(emailReservationRepository, times(2)).deleteReservationIfOwned(eq("retry@test.com"), anyString(), anyString());
    }
}
