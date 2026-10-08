package com.employee.management.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseDto {

    private Long id;
    private String name;
    private String email;
    private String department;
    private Double salary;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}