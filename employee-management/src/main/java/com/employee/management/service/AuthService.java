package com.employee.management.service;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.document.UserDocument;
import com.employee.management.dto.LoginRequest;
import com.employee.management.dto.LoginResponse;
import com.employee.management.dto.RegisterRequest;
import com.employee.management.enums.Role;
import com.employee.management.repository.es.EsEmailReservationRepository;
import com.employee.management.repository.es.EsEmployeeRepository;
import com.employee.management.repository.es.EsMutationJournalRepository;
import com.employee.management.repository.es.EsUserRepository;
import com.employee.management.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final EsUserRepository esUserRepository;
    private final EsEmployeeRepository esEmployeeRepository;
    private final EsEmailReservationRepository emailReservationRepository;
    private final EsMutationJournalRepository journalRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            EsUserRepository esUserRepository,
            EsEmployeeRepository esEmployeeRepository,
            EsEmailReservationRepository emailReservationRepository,
            EsMutationJournalRepository journalRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.esUserRepository = esUserRepository;
        this.esEmployeeRepository = esEmployeeRepository;
        this.emailReservationRepository = emailReservationRepository;
        this.journalRepository = journalRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public String register(RegisterRequest request) {
        if (request == null || request.email() == null || request.password() == null) {
            throw new IllegalArgumentException("Email and password are required");
        }

        String normalizedEmail = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        String userUuid = UUID.randomUUID().toString();
        String opId = UUID.randomUUID().toString();

        // Atomic email reservation in Elasticsearch (conflict detection via document create)
        boolean reserved = emailReservationRepository.reserveEmail(normalizedEmail, userUuid, opId);
        if (!reserved) {
            throw new IllegalArgumentException("User already exists with email: " + request.email());
        }

        boolean userCreated = false;
        try {
            String encodedPassword = passwordEncoder.encode(request.password());

            // Record journal PENDING
            journalRepository.recordPending(
                    opId, "USER", userUuid, 1L, "CREATE",
                    String.format("{\"email\":\"%s\",\"passwordHash\":\"%s\",\"role\":\"ROLE_EMP\"}", normalizedEmail, encodedPassword),
                    null
            );

            // Save UserDocument to Elasticsearch
            UserDocument userDoc = new UserDocument(
                    userUuid,
                    normalizedEmail,
                    encodedPassword,
                    Role.ROLE_EMP,
                    LocalDateTime.now(),
                    opId,
                    1L,
                    Collections.singletonList(opId),
                    null
            );
            esUserRepository.saveUser(userDoc);
            userCreated = true;
            journalRepository.markCommitted(opId);

            // Link with existing Employee or create a default linked employee
            Optional<EmployeeDocument> existingEmpOpt = esEmployeeRepository.findByEmail(normalizedEmail);
            if (existingEmpOpt.isPresent()) {
                EmployeeDocument existingEmp = existingEmpOpt.get();
                if (existingEmp.getUserId() != null && !userUuid.equals(existingEmp.getUserId())) {
                    throw new IllegalStateException("Existing employee record for " + normalizedEmail + " is already linked to another user account");
                }
                existingEmp.setUserId(userUuid);
                existingEmp.setUpdatedAt(LocalDateTime.now());
                esEmployeeRepository.saveEmployee(existingEmp);
            } else {
                String defaultName = normalizedEmail.contains("@")
                        ? normalizedEmail.substring(0, normalizedEmail.indexOf('@'))
                        : "Employee";
                String empUuid = UUID.randomUUID().toString();
                EmployeeDocument newEmp = new EmployeeDocument(
                        empUuid, defaultName, normalizedEmail, "Unassigned",
                        BigDecimal.ZERO, "",
                        LocalDateTime.now(), LocalDateTime.now(),
                        userUuid, opId, 1L, Collections.singletonList(opId), null
                );
                esEmployeeRepository.saveEmployee(newEmp);
            }

            return "User registered successfully";
        } catch (Exception e) {
            log.error("Registration failed for email '{}'. Performing compensating rollback: {}", normalizedEmail, e.getMessage());
            if (userCreated) {
                try {
                    esUserRepository.deleteById(userUuid);
                } catch (Exception userRollbackEx) {
                    log.error("CRITICAL: Failed to delete user '{}' during registration rollback: {}", userUuid, userRollbackEx.getMessage(), userRollbackEx);
                }
            }
            try {
                journalRepository.markFailed(opId, "Registration failed: " + e.getMessage());
            } catch (Exception journalEx) {
                log.warn("Could not mark journal op '{}' as FAILED: {}", opId, journalEx.getMessage());
            }

            // Clean up email reservation with retries
            boolean reservationCleaned = false;
            for (int attempt = 1; attempt <= 3 && !reservationCleaned; attempt++) {
                try {
                    reservationCleaned = emailReservationRepository.deleteReservationIfOwned(normalizedEmail, userUuid, opId);
                } catch (Exception resCleanEx) {
                    log.warn("Attempt {} to delete email reservation for '{}' failed: {}", attempt, normalizedEmail, resCleanEx.getMessage());
                }
                if (!reservationCleaned && attempt < 3) {
                    try { Thread.sleep(50); } catch (InterruptedException ignored) {}
                }
            }
            if (!reservationCleaned) {
                log.error("CRITICAL: Email reservation for '{}' (userId: {}, opId: {}) could not be released", normalizedEmail, userUuid, opId);
            }
            throw e;
        }
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password())
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails);

        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(authority -> authority.getAuthority())
                .orElse(Role.ROLE_EMP.name());

        if ("ROLE_USER".equals(role)) {
            role = Role.ROLE_EMP.name();
        }

        return new LoginResponse(token, userDetails.getUsername(), role);
    }
}