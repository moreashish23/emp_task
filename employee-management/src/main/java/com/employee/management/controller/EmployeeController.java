package com.employee.management.controller;

import com.employee.management.dto.EmployeeDto;
import com.employee.management.enums.Role;
import com.employee.management.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EmployeeDto> createEmployee(
            @Valid @RequestBody EmployeeDto employeeDto) {

        EmployeeDto employee = employeeService.createEmployee(employeeDto);

        return new ResponseEntity<>(employee, HttpStatus.CREATED);
    }

    @GetMapping("/me")
    public ResponseEntity<EmployeeDto> getCurrentEmployee(Authentication authentication) {

        EmployeeDto employee = employeeService.getEmployeeForUser(authentication.getName());

        return ResponseEntity.ok(employee);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDto> getEmployeeById(
            @PathVariable String id,
            Authentication authentication) {

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> Role.ROLE_ADMIN.name().equals(a.getAuthority()));
        String currentUserEmail = authentication != null ? authentication.getName() : "";

        EmployeeDto employee = employeeService.getById(id, currentUserEmail, isAdmin);

        return new ResponseEntity<>(employee, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Page<EmployeeDto>> getAllEmployees(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page number cannot be negative"
            );
        }

        if (size < 1 || size > 100) {
            throw new IllegalArgumentException(
                    "Page size must be between 1 and 100"
            );
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> Role.ROLE_ADMIN.name().equals(a.getAuthority()));
        String currentUserEmail = authentication != null ? authentication.getName() : "";

        Page<EmployeeDto> employees =
                employeeService.searchEmployees(keyword, pageable, currentUserEmail, isAdmin);

        return ResponseEntity.ok(employees);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDto> updateEmployee(
            @PathVariable String id,
            @Valid @RequestBody EmployeeDto employeeDto,
            Authentication authentication
    ) {

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> Role.ROLE_ADMIN.name().equals(a.getAuthority()));

        String currentUserEmail = authentication != null ? authentication.getName() : "";

        EmployeeDto employee =
                employeeService.updateEmployee(id, employeeDto, currentUserEmail, isAdmin);

        return new ResponseEntity<>(employee, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteEmployee(
            @PathVariable String id) {

        employeeService.deleteEmployee(id);

        return new ResponseEntity<>(
                "Employee deleted successfully",
                HttpStatus.OK
        );
    }
}