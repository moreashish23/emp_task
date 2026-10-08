package com.employee.management.service;

import com.employee.management.dto.EmployeeRequestDto;
import com.employee.management.dto.EmployeeResponseDto;
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

    public EmployeeResponseDto createEmployee(EmployeeRequestDto requestDto) {

        Employee employee = new Employee();

        employee.setName(requestDto.getName());
        employee.setEmail(requestDto.getEmail());
        employee.setDepartment(requestDto.getDepartment());
        employee.setSalary(requestDto.getSalary());
        employee.setPhone(requestDto.getPhone());

        Employee saved = employeeRepository.save(employee);

        return new EmployeeResponseDto(
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

    public EmployeeResponseDto getById(Long id) {

        Employee employee = employeeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Employee not found with id: " + id
                )
        );

        return new EmployeeResponseDto(
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

    public List<EmployeeResponseDto> getAllEmployees() {

        return employeeRepository.findAll()
                .stream()
                .map(employee -> new EmployeeResponseDto(
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

    public EmployeeResponseDto updateEmployee( Long id,EmployeeRequestDto employeeRequest) {

        Employee existingEmployee = employeeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Employee not found with id: " + id
                )
        );

        existingEmployee.setName(employeeRequest.getName());
        existingEmployee.setEmail(employeeRequest.getEmail());
        existingEmployee.setDepartment(employeeRequest.getDepartment());
        existingEmployee.setSalary(employeeRequest.getSalary());
        existingEmployee.setPhone(employeeRequest.getPhone());

        Employee updated = employeeRepository.save(existingEmployee);

        return new EmployeeResponseDto(
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