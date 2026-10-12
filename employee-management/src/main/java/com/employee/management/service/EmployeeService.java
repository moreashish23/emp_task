package com.employee.management.service;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.document.UserDocument;
import com.employee.management.dto.EmployeeDto;
import com.employee.management.exception.ResourceNotFoundException;
import com.employee.management.repository.es.EsEmailReservationRepository;
import com.employee.management.repository.es.EsEmployeeRepository;
import com.employee.management.repository.es.EsMutationJournalRepository;
import com.employee.management.repository.es.EsUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EmployeeService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeService.class);

    private final EsEmployeeRepository esEmployeeRepository;
    private final EsUserRepository esUserRepository;
    private final EsEmailReservationRepository emailReservationRepository;
    private final EsMutationJournalRepository journalRepository;

    public EmployeeService(
            EsEmployeeRepository esEmployeeRepository,
            EsUserRepository esUserRepository,
            EsEmailReservationRepository emailReservationRepository,
            EsMutationJournalRepository journalRepository
    ) {
        this.esEmployeeRepository = esEmployeeRepository;
        this.esUserRepository = esUserRepository;
        this.emailReservationRepository = emailReservationRepository;
        this.journalRepository = journalRepository;
    }

    public EmployeeDto createEmployee(EmployeeDto employeeDto) {
        if (employeeDto.salary() == null || employeeDto.salary() < 0) {
            throw new IllegalArgumentException("Salary is required and must be non-negative");
        }
        if (employeeDto.email() == null || employeeDto.email().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        String normalizedEmail = employeeDto.email().trim().toLowerCase(Locale.ROOT);
        Optional<EmployeeDocument> duplicateEmp = esEmployeeRepository.findByEmail(normalizedEmail);
        if (duplicateEmp.isPresent()) {
            throw new IllegalArgumentException("Employee already exists with email: " + employeeDto.email());
        }

        String empUuid = UUID.randomUUID().toString();
        String opId = UUID.randomUUID().toString();
        BigDecimal salary = BigDecimal.valueOf(employeeDto.salary()).setScale(2, RoundingMode.HALF_UP);

        String userId = null;
        Optional<UserDocument> userOpt = esUserRepository.findByEmail(normalizedEmail);
        if (userOpt.isPresent()) {
            userId = userOpt.get().getId();
            Optional<EmployeeDocument> userEmp = esEmployeeRepository.findByUserId(userId);
            if (userEmp.isPresent()) {
                throw new IllegalArgumentException("User with email " + employeeDto.email() + " is already linked to an employee profile");
            }
        }

        LocalDateTime now = LocalDateTime.now();
        EmployeeDocument doc = new EmployeeDocument(
                empUuid, employeeDto.name(), normalizedEmail, employeeDto.department(),
                salary, employeeDto.phone(), now, now,
                userId, opId, 1L, Collections.singletonList(opId), null
        );

        journalRepository.recordPending(
                opId, "EMPLOYEE", empUuid, 1L, "CREATE",
                String.format("{\"name\":\"%s\",\"email\":\"%s\",\"department\":\"%s\",\"salary\":%s,\"phone\":\"%s\",\"userId\":%s}",
                        doc.getName(), doc.getEmail(), doc.getDepartment(), doc.getSalary(), doc.getPhone(),
                        userId != null ? "\"" + userId + "\"" : "null"),
                null
        );

        EmployeeDocument saved = esEmployeeRepository.saveEmployee(doc);
        journalRepository.markCommitted(opId);

        return toDto(saved, employeeDto.email(), true);
    }

    public EmployeeDto getById(String id, String currentUserEmail, boolean isAdmin) {
        Optional<EmployeeDocument> docOpt = esEmployeeRepository.findById(id);
        if (docOpt.isPresent()) {
            return toDto(docOpt.get(), currentUserEmail, isAdmin);
        }
        throw new ResourceNotFoundException("Employee not found with id: " + id);
    }

    public EmployeeDto getById(Long id, String currentUserEmail, boolean isAdmin) {
        return getById(id != null ? String.valueOf(id) : null, currentUserEmail, isAdmin);
    }

    public EmployeeDto getEmployeeForUser(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new ResourceNotFoundException("User email cannot be blank");
        }

        Optional<UserDocument> userOpt = esUserRepository.findByEmail(userEmail);
        if (userOpt.isPresent()) {
            Optional<EmployeeDocument> empOpt = esEmployeeRepository.findByUserId(userOpt.get().getId());
            if (empOpt.isPresent()) {
                return toDto(empOpt.get(), userEmail, false);
            }
        }

        Optional<EmployeeDocument> byEmail = esEmployeeRepository.findByEmail(userEmail);
        if (byEmail.isPresent()) {
            return toDto(byEmail.get(), userEmail, false);
        }

        throw new ResourceNotFoundException("No employee profile found for user: " + userEmail);
    }

    public List<EmployeeDto> getAllEmployees(String currentUserEmail, boolean isAdmin) {
        return esEmployeeRepository.findAll(0, 500).stream()
                .map(e -> toDto(e, currentUserEmail, isAdmin))
                .collect(Collectors.toList());
    }

    public Page<EmployeeDto> searchEmployees(String keyword, Pageable pageable,
                                              String currentUserEmail, boolean isAdmin) {
        return esEmployeeRepository.search(keyword, pageable)
                .map(doc -> toDto(doc, currentUserEmail, isAdmin));
    }

    public EmployeeDto updateEmployee(String id, EmployeeDto employeeDto,
                                      String currentUserEmail, boolean isAdmin) {
        EmployeeDocument existing = esEmployeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        String opId = UUID.randomUUID().toString();
        if (!isAdmin) {
            boolean isOwner = false;
            if (existing.getUserId() != null) {
                Optional<UserDocument> u = esUserRepository.findById(existing.getUserId());
                if (u.isPresent() && currentUserEmail.equalsIgnoreCase(u.get().getEmail())) {
                    isOwner = true;
                }
            }
            if (!isOwner) {
                throw new AccessDeniedException("Access denied: You are only permitted to update your own employee profile.");
            }
            existing.setName(employeeDto.name());
            existing.setDepartment(employeeDto.department());
            existing.setPhone(employeeDto.phone());
        } else {
            existing.setName(employeeDto.name());
            if (employeeDto.email() != null && !employeeDto.email().isBlank()) {
                String newEmail = employeeDto.email().trim().toLowerCase(Locale.ROOT);
                String oldEmail = existing.getEmail() != null ? existing.getEmail().trim().toLowerCase(Locale.ROOT) : "";
                if (!newEmail.equals(oldEmail)) {
                    Optional<EmployeeDocument> conflict = esEmployeeRepository.findByEmail(newEmail);
                    if (conflict.isPresent() && !conflict.get().getId().equals(existing.getId())) {
                        throw new IllegalArgumentException("Employee already exists with email: " + employeeDto.email());
                    }
                    if (existing.getUserId() != null) {
                        Optional<UserDocument> userOpt = esUserRepository.findById(existing.getUserId());
                        if (userOpt.isPresent()) {
                            UserDocument u = userOpt.get();
                            boolean reserved = emailReservationRepository.reserveEmail(newEmail, u.getId(), opId);
                            if (!reserved) {
                                throw new IllegalArgumentException("User account already exists with email: " + employeeDto.email());
                            }
                            emailReservationRepository.deleteReservationIfOwned(oldEmail, u.getId(), null);
                            u.setEmail(newEmail);
                            esUserRepository.saveUser(u);
                        }
                    }
                    existing.setEmail(newEmail);
                }
            }
            existing.setDepartment(employeeDto.department());
            if (employeeDto.salary() != null) {
                existing.setSalary(BigDecimal.valueOf(employeeDto.salary()).setScale(2, RoundingMode.HALF_UP));
            }
            existing.setPhone(employeeDto.phone());
        }

        existing.setUpdatedAt(LocalDateTime.now());
        existing.setLastOpId(opId);
        existing.setEntityVersion(existing.getEntityVersion() != null ? existing.getEntityVersion() + 1 : 2L);

        journalRepository.recordPending(
                opId, "EMPLOYEE", existing.getId(), existing.getEntityVersion(), "UPDATE",
                String.format("{\"name\":\"%s\",\"email\":\"%s\",\"department\":\"%s\",\"salary\":%s,\"phone\":\"%s\",\"userId\":%s}",
                        existing.getName(), existing.getEmail(), existing.getDepartment(), existing.getSalary(), existing.getPhone(),
                        existing.getUserId() != null ? "\"" + existing.getUserId() + "\"" : "null"),
                null
        );

        EmployeeDocument updated = esEmployeeRepository.saveEmployee(existing);
        journalRepository.markCommitted(opId);

        return toDto(updated, currentUserEmail, isAdmin);
    }

    public EmployeeDto updateEmployee(Long id, EmployeeDto employeeDto,
                                      String currentUserEmail, boolean isAdmin) {
        return updateEmployee(id != null ? String.valueOf(id) : null, employeeDto, currentUserEmail, isAdmin);
    }

    public void deleteEmployee(String id) {
        EmployeeDocument doc = esEmployeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        String opId = UUID.randomUUID().toString();
        journalRepository.recordPending(
                opId, "EMPLOYEE", doc.getId(),
                doc.getEntityVersion() != null ? doc.getEntityVersion() + 1 : 2L,
                "DELETE", "{}", null
        );
        esEmployeeRepository.deleteById(doc.getId());
        journalRepository.markCommitted(opId);
    }

    public void deleteEmployee(Long id) {
        deleteEmployee(id != null ? String.valueOf(id) : null);
    }

    private EmployeeDto toDto(EmployeeDocument doc, String currentUserEmail, boolean isAdmin) {
        boolean isOwner = false;
        if (currentUserEmail != null && !currentUserEmail.isBlank() && doc.getUserId() != null) {
            Optional<UserDocument> u = esUserRepository.findById(doc.getUserId());
            if (u.isPresent() && currentUserEmail.equalsIgnoreCase(u.get().getEmail())) {
                isOwner = true;
            }
        }

        Double salary = (isAdmin || isOwner) ? (doc.getSalary() != null ? doc.getSalary().doubleValue() : null) : null;

        return new EmployeeDto(
                doc.getId(),
                doc.getName(),
                doc.getEmail(),
                doc.getDepartment(),
                salary,
                doc.getPhone(),
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}