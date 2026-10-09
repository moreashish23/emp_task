package com.employee.management.service;

import com.employee.management.dto.EmployeeDto;
import com.employee.management.entity.Employee;
import com.employee.management.exception.ResourceNotFoundException;
import com.employee.management.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    public EmployeeDto createEmployee(EmployeeDto employeeDto) {

        Employee employee = new Employee();

        employee.setName(employeeDto.name());
        employee.setEmail(employeeDto.email());
        employee.setDepartment(employeeDto.department());
        employee.setSalary(employeeDto.salary());
        employee.setPhone(employeeDto.phone());

        Employee saved = employeeRepository.save(employee);

        return new EmployeeDto(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getDepartment(),
                saved.getSalary(),
                saved.getPhone(),
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        );
    }

    public EmployeeDto getById(Long id) {

        Employee employee = employeeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Employee not found with id: " + id
                )
        );

        return new EmployeeDto(
                employee.getId(),
                employee.getName(),
                employee.getEmail(),
                employee.getDepartment(),
                employee.getSalary(),
                employee.getPhone(),
                employee.getCreatedAt(),
                employee.getUpdatedAt()
        );
    }

    public List<EmployeeDto> getAllEmployees() {

        return employeeRepository.findAll()
                .stream()
                .map(employee -> new EmployeeDto(
                        employee.getId(),
                        employee.getName(),
                        employee.getEmail(),
                        employee.getDepartment(),
                        employee.getSalary(),
                        employee.getPhone(),
                        employee.getCreatedAt(),
                        employee.getUpdatedAt()
                ))
                .collect(Collectors.toList());
    }

    public EmployeeDto updateEmployee(
            Long id,
            EmployeeDto employeeDto
    ) {

        Employee existingEmployee = employeeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Employee not found with id: " + id
                )
        );

        existingEmployee.setName(employeeDto.name());
        existingEmployee.setEmail(employeeDto.email());
        existingEmployee.setDepartment(employeeDto.department());
        existingEmployee.setSalary(employeeDto.salary());
        existingEmployee.setPhone(employeeDto.phone());

        Employee updated = employeeRepository.save(existingEmployee);

        return new EmployeeDto(
                updated.getId(),
                updated.getName(),
                updated.getEmail(),
                updated.getDepartment(),
                updated.getSalary(),
                updated.getPhone(),
                updated.getCreatedAt(),
                updated.getUpdatedAt()
        );
    }

    public void deleteEmployee(Long id) {

        if (!employeeRepository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "Employee not found with id: " + id
            );
        }

        employeeRepository.deleteById(id);
    }
}