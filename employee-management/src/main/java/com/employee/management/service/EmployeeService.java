package com.employee.management.service;

import com.employee.management.dto.EmployeeDto;
import com.employee.management.document.EmployeeDocument;
import com.employee.management.entity.Employee;
import com.employee.management.entity.UserAccount;
import com.employee.management.exception.ResourceNotFoundException;
import com.employee.management.repository.EmployeeRepository;
import com.employee.management.repository.EmployeeSearchRepository;
import com.employee.management.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmployeeSearchRepository employeeSearchRepository;

    public EmployeeService(EmployeeRepository employeeRepository, UserRepository userRepository,
                           EmployeeSearchRepository employeeSearchRepository) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.employeeSearchRepository = employeeSearchRepository;
    }

    @Transactional
    public EmployeeDto createEmployee(EmployeeDto dto) {
        validateSalary(dto.salary());
        String email = normalize(dto.email());
        if (employeeRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Employee already exists with email: " + email);
        }

        Long userId = userRepository.findByEmailIgnoreCase(email).map(UserAccount::getId).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        Employee employee = new Employee(null, dto.name(), email, dto.department(), dto.salary(), dto.phone(), now, now, userId);
        Employee saved = employeeRepository.save(employee);
        indexEmployee(saved);
        return toDto(saved, email, true);
    }

    @Transactional(readOnly = true)
    public EmployeeDto getById(String id, String currentUserEmail, boolean isAdmin) {
        return toDto(findById(id), currentUserEmail, isAdmin);
    }

    @Transactional(readOnly = true)
    public EmployeeDto getById(Long id, String currentUserEmail, boolean isAdmin) {
        if (id == null) throw new ResourceNotFoundException("Employee id cannot be null");
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
        return toDto(employee, currentUserEmail, isAdmin);
    }

    @Transactional(readOnly = true)
    public EmployeeDto getEmployeeForUser(String userEmail) {
        String email = normalize(userEmail);
        UserAccount user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        Employee employee = employeeRepository.findByUserId(user.getId())
                .or(() -> employeeRepository.findByEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("No employee profile found for user: " + email));
        return toDto(employee, email, false);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeDto> searchEmployees(String keyword, Pageable pageable, String currentUserEmail, boolean isAdmin) {
        return searchEmployees(keyword, null, pageable, currentUserEmail, isAdmin);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeDto> searchEmployees(String keyword, String department, Pageable pageable, String currentUserEmail, boolean isAdmin) {
        String kw = keyword == null ? "" : keyword.trim();
        String dept = department == null ? "" : department.trim();

        // 1. Neither keyword nor department: return all from MySQL
        if (kw.isEmpty() && dept.isEmpty()) {
            return employeeRepository.findAll(pageable)
                    .map(employee -> toDto(employee, currentUserEmail, isAdmin));
        }

        // 2. Only department specified: filter authoritative MySQL by department
        if (kw.isEmpty()) {
            return employeeRepository.findByDepartmentIgnoreCase(dept, pageable)
                    .map(employee -> toDto(employee, currentUserEmail, isAdmin));
        }

        // 3. Keyword specified (with or without department):
        // Elasticsearch is responsible for employee-name searching
        try {
            if (dept.isEmpty()) {
                // Name search only: paginate via Elasticsearch and hydrate from MySQL
                Page<EmployeeDocument> searchPage = employeeSearchRepository
                        .findByNameContainingIgnoreCase(kw, pageable);

                java.util.List<Long> ids = searchPage.getContent().stream()
                        .map(doc -> {
                            try { return Long.parseLong(doc.getId()); } catch (Exception e) { return null; }
                        })
                        .filter(java.util.Objects::nonNull)
                        .toList();

                if (ids.isEmpty()) {
                    return Page.empty(pageable);
                }

                java.util.Map<Long, Employee> employeeMap = employeeRepository.findAllById(ids).stream()
                        .collect(java.util.stream.Collectors.toMap(Employee::getId, java.util.function.Function.identity()));

                java.util.List<EmployeeDto> dtos = new java.util.ArrayList<>();
                for (EmployeeDocument doc : searchPage.getContent()) {
                    try {
                        Long id = Long.parseLong(doc.getId());
                        Employee emp = employeeMap.get(id);
                        if (emp != null) {
                            dtos.add(toDto(emp, currentUserEmail, isAdmin));
                        }
                    } catch (Exception ignored) {}
                }

                return new org.springframework.data.domain.PageImpl<>(dtos, pageable, searchPage.getTotalElements());
            } else {
                // Both name search and department filter:
                // Find matching employee IDs by name from Elasticsearch, then filter by department in MySQL
                java.util.List<EmployeeDocument> nameMatches = employeeSearchRepository.findByNameContainingIgnoreCase(kw);
                if (nameMatches.isEmpty()) {
                    return Page.empty(pageable);
                }

                java.util.List<Long> matchingIds = nameMatches.stream()
                        .map(doc -> {
                            try { return Long.parseLong(doc.getId()); } catch (Exception e) { return null; }
                        })
                        .filter(java.util.Objects::nonNull)
                        .toList();

                if (matchingIds.isEmpty()) {
                    return Page.empty(pageable);
                }

                return employeeRepository.findByIdInAndDepartmentIgnoreCase(matchingIds, dept, pageable)
                        .map(employee -> toDto(employee, currentUserEmail, isAdmin));
            }
        } catch (Exception ex) {
            // Graceful fallback to MySQL if Elasticsearch encounters an issue
            return employeeRepository.searchFallback(kw, pageable)
                    .map(employee -> toDto(employee, currentUserEmail, isAdmin));
        }
    }

    @Transactional
    public EmployeeDto updateEmployee(String id, EmployeeDto dto, String currentUserEmail, boolean isAdmin) {
        Employee employee = findById(id);
        String currentEmail = normalize(currentUserEmail);

        if (!isAdmin && !isOwner(employee, currentEmail)) {
            throw new AccessDeniedException("You can update only your own employee profile");
        }

        employee.setName(dto.name());
        employee.setDepartment(dto.department());
        employee.setPhone(dto.phone());

        if (isAdmin) {
            if (dto.salary() != null) validateSalary(dto.salary());
            if (dto.salary() != null) employee.setSalary(dto.salary());

            String newEmail = normalize(dto.email());
            String oldEmail = normalize(employee.getEmail());
            if (!newEmail.equals(oldEmail)) {
                Optional<Employee> conflict = employeeRepository.findByEmail(newEmail);
                if (conflict.isPresent() && !conflict.get().getId().equals(employee.getId())) {
                    throw new IllegalArgumentException("Employee already exists with email: " + newEmail);
                }
                if (employee.getUserId() != null) {
                    UserAccount user = userRepository.findById(employee.getUserId()).orElse(null);
                    if (user != null && userRepository.existsByEmailIgnoreCase(newEmail)) {
                        throw new IllegalArgumentException("User already exists with email: " + newEmail);
                    }
                    if (user != null) user.setEmail(newEmail);
                }
                employee.setEmail(newEmail);
            }
        }

        employee.setUpdatedAt(LocalDateTime.now());
        Employee saved = employeeRepository.save(employee);
        indexEmployee(saved);
        return toDto(saved, currentEmail, isAdmin);
    }

    @Transactional
    public EmployeeDto updateEmployee(Long id, EmployeeDto dto, String currentUserEmail, boolean isAdmin) {
        if (id == null) throw new ResourceNotFoundException("Employee id cannot be null");
        return updateEmployee(String.valueOf(id), dto, currentUserEmail, isAdmin);
    }

    @Transactional
    public void deleteEmployee(String id) {
        Employee employee = findById(id);
        employeeRepository.delete(employee);
        employeeSearchRepository.deleteById(String.valueOf(employee.getId()));
    }

    @Transactional
    public void deleteEmployee(Long id) {
        if (id == null) throw new ResourceNotFoundException("Employee id cannot be null");
        deleteEmployee(String.valueOf(id));
    }

    private Employee findById(String id) {
        if (id == null || id.isBlank()) throw new ResourceNotFoundException("Employee id cannot be blank");
        try {
            Long numericId = Long.parseLong(id.trim());
            return employeeRepository.findById(numericId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
        } catch (NumberFormatException ex) {
            throw new ResourceNotFoundException("Invalid employee id: " + id);
        }
    }

    private boolean isOwner(Employee employee, String email) {
        if (employee.getUserId() == null || email.isBlank()) return false;
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> user.getId().equals(employee.getUserId()))
                .orElse(false);
    }

    private EmployeeDto toDto(Employee employee, String currentUserEmail, boolean isAdmin) {
        boolean owner = isOwner(employee, normalize(currentUserEmail));
        Double salary = (isAdmin || owner) ? employee.getSalary() : null;
        return new EmployeeDto(employee.getId(), employee.getName(), employee.getEmail(), employee.getDepartment(),
                salary, employee.getPhone(), employee.getCreatedAt(), employee.getUpdatedAt());
    }

    private void indexEmployee(Employee employee) {
        employeeSearchRepository.save(new EmployeeDocument(String.valueOf(employee.getId()), employee.getName()));
    }

    private void validateSalary(Double salary) {
        if (salary == null || salary < 0) throw new IllegalArgumentException("Salary is required and must be non-negative");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
