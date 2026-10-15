package com.employee.management.controller;

import com.employee.management.dto.ChangePasswordRequest;
import com.employee.management.dto.LoginRequest;
import com.employee.management.dto.LoginResponse;
import com.employee.management.dto.RegisterRequest;
import com.employee.management.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(
            @Valid @RequestBody RegisterRequest request
    ) {

        String message = authService.register(request);

        return new ResponseEntity<>(
                message,
                HttpStatus.CREATED
        );
    }

    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok("Password changed successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {

        LoginResponse response =
                authService.login(request);

        return new ResponseEntity<>(
                response,
                HttpStatus.OK
        );
    }
}