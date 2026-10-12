package com.employee.management.service;

import com.employee.management.dto.LoginRequest;
import com.employee.management.dto.LoginResponse;
import com.employee.management.dto.RegisterRequest;
import com.employee.management.entity.Employee;
import com.employee.management.entity.UserAccount;
import com.employee.management.enums.Role;
import com.employee.management.repository.EmployeeRepository;
import com.employee.management.repository.UserRepository;
import com.employee.management.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       EmployeeRepository employeeRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public String register(RegisterRequest request) {
        if (request == null || request.email() == null || request.password() == null) {
            throw new IllegalArgumentException("Email and password are required");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("User already exists with email: " + email);
        }

        UserAccount user = new UserAccount(
                email,
                passwordEncoder.encode(request.password()),
                Role.ROLE_EMP
        );
        user = userRepository.save(user);

        Employee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee == null) {
            String name = email.contains("@") ? email.substring(0, email.indexOf('@')) : "Employee";
            LocalDateTime now = LocalDateTime.now();
            employee = new Employee(null, name, email, "Unassigned", 0.0, "", now, now, user.getId());
        } else {
            if (employee.getUserId() != null && !employee.getUserId().equals(user.getId())) {
                throw new IllegalArgumentException("Employee profile is already linked to another account");
            }
            employee.setUserId(user.getId());
            employee.setUpdatedAt(LocalDateTime.now());
        }
        employeeRepository.save(employee);
        return "User registered successfully";
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email().trim().toLowerCase(Locale.ROOT), request.password())
        );
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails);
        String role = userDetails.getAuthorities().stream()
                .findFirst().map(authority -> authority.getAuthority()).orElse(Role.ROLE_EMP.name());
        if ("ROLE_USER".equals(role)) {
            role = Role.ROLE_EMP.name();
        }
        return new LoginResponse(token, userDetails.getUsername(), role);
    }
}
