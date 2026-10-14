package com.employee.management.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record EmployeeDto(

        String id,

        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Please enter a valid email")
        String email,

        @NotBlank(message = "Department is required")
        String department,

        @Min(value = 0, message = "Salary must be non-negative")
        Double salary,

        @Pattern(
                regexp = "^[0-9]{10}$",
                message = "Phone number must contain exactly 10 digits"
        )
        String phone,

        LocalDateTime createdAt,

        LocalDateTime updatedAt,

        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        String password
) {
    public EmployeeDto(long numericId, String name, String email, String department, Double salary, String phone, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(String.valueOf(numericId), name, email, department, salary, phone, createdAt, updatedAt, null);
    }
}