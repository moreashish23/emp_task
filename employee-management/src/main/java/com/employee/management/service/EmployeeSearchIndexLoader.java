package com.employee.management.service;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.repository.EmployeeRepository;
import com.employee.management.repository.EmployeeSearchRepository;
import com.employee.management.entity.Employee;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class EmployeeSearchIndexLoader {

    @Bean
    ApplicationRunner loadEmployeeNames(EmployeeRepository employees, EmployeeSearchRepository searchRepository) {
        return args -> {
            try {
                searchRepository.deleteAll();
                List<Employee> allEmployees = employees.findAll();
                List<EmployeeDocument> docs = allEmployees.stream()
                        .map(employee -> new EmployeeDocument(String.valueOf(employee.getId()), employee.getName()))
                        .toList();
                searchRepository.saveAll(docs);
            } catch (Exception ignored) {
            }
        };
    }
}
