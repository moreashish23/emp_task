package com.employee.management.dto;

public record LoginResponse(
        String token,
        String email,
        String role
) {
}