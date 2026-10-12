package com.employee.management.config;

import com.employee.management.document.EmployeeDocument;
import com.employee.management.entity.Employee;
import com.employee.management.entity.UserAccount;
import com.employee.management.enums.Role;
import com.employee.management.repository.EmployeeRepository;
import com.employee.management.repository.EmployeeSearchRepository;
import com.employee.management.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;


@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeSearchRepository employeeSearchRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository,
                      EmployeeRepository employeeRepository,
                      EmployeeSearchRepository employeeSearchRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.employeeSearchRepository = employeeSearchRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        List<SeedAccount> accounts = List.of(
                new SeedAccount("Admin One", "admin1@test.com", "Admin@123", Role.ROLE_ADMIN, "IT", 95000, "9000000001"),
                new SeedAccount("Admin Two", "admin2@test.com", "Admin@123", Role.ROLE_ADMIN, "HR", 90000, "9000000002"),
                new SeedAccount("Aarav Sharma", "aarav@test.com", "Emp@123", Role.ROLE_EMP, "IT", 45000, "9000000003"),
                new SeedAccount("Priya Patel", "priya@test.com", "Emp@123", Role.ROLE_EMP, "HR", 48000, "9000000004"),
                new SeedAccount("Rohan Desai", "rohan@test.com", "Emp@123", Role.ROLE_EMP, "Finance", 52000, "9000000005"),
                new SeedAccount("Sneha Joshi", "sneha@test.com", "Emp@123", Role.ROLE_EMP, "Marketing", 46000, "9000000006"),
                new SeedAccount("Vikram Singh", "vikram@test.com", "Emp@123", Role.ROLE_EMP, "IT", 55000, "9000000007"),
                new SeedAccount("Neha Shah", "neha@test.com", "Emp@123", Role.ROLE_EMP, "HR", 43000, "9000000008"),
                new SeedAccount("Arjun More", "arjun@test.com", "Emp@123", Role.ROLE_EMP, "Operations", 47000, "9000000009"),
                new SeedAccount("Isha Kulkarni", "isha@test.com", "Emp@123", Role.ROLE_EMP, "Finance", 51000, "9000000010"),
                new SeedAccount("Kabir Mehta", "kabir@test.com", "Emp@123", Role.ROLE_EMP, "IT", 58000, "9000000011"),
                new SeedAccount("Ananya Rao", "ananya@test.com", "Emp@123", Role.ROLE_EMP, "Marketing", 44000, "9000000012"),
                new SeedAccount("Dev Malhotra", "dev@test.com", "Emp@123", Role.ROLE_EMP, "Operations", 49000, "9000000013"),
                new SeedAccount("Meera Nair", "meera@test.com", "Emp@123", Role.ROLE_EMP, "Finance", 53000, "9000000014"),
                new SeedAccount("Kunal Verma", "kunal@test.com", "Emp@123", Role.ROLE_EMP, "IT", 60000, "9000000015"),
                new SeedAccount("Pooja Deshmukh", "pooja@test.com", "Emp@123", Role.ROLE_EMP, "HR", 42000, "9000000016"),
                new SeedAccount("Aditya Joshi", "aditya@test.com", "Emp@123", Role.ROLE_EMP, "Operations", 47500, "9000000017"),
                new SeedAccount("Riya Kapoor", "riya@test.com", "Emp@123", Role.ROLE_EMP, "Marketing", 46500, "9000000018"),
                new SeedAccount("Sahil Gupta", "sahil@test.com", "Emp@123", Role.ROLE_EMP, "Finance", 54000, "9000000019"),
                new SeedAccount("Tanvi Patil", "tanvi@test.com", "Emp@123", Role.ROLE_EMP, "IT", 57000, "9000000020"),
                new SeedAccount("Omkar Pawar", "omkar@test.com", "Emp@123", Role.ROLE_EMP, "Operations", 45500, "9000000021"),
                new SeedAccount("Aditi Sane", "aditi@test.com", "Emp@123", Role.ROLE_EMP, "HR", 43500, "9000000022")
        );

        for (SeedAccount account : accounts) {
            // These are fixed test accounts. Re-running the seeder restores their test password and role.
            UserAccount user = userRepository.findByEmailIgnoreCase(account.email()).orElseGet(UserAccount::new);
            user.setEmail(account.email());
            user.setPasswordHash(passwordEncoder.encode(account.password()));
            user.setRole(account.role());
            user = userRepository.save(user);

            Employee employee = employeeRepository.findByEmail(account.email()).orElseGet(Employee::new);
            LocalDateTime now = LocalDateTime.now();
            employee.setName(account.name());
            employee.setEmail(account.email());
            employee.setDepartment(account.department());
            employee.setSalary(account.salary());
            employee.setPhone(account.phone());
            employee.setUserId(user.getId());
            if (employee.getCreatedAt() == null) {
                employee.setCreatedAt(now);
            }
            employee.setUpdatedAt(now);
            employee = employeeRepository.save(employee);

            // Keep employee-name search ready immediately, without waiting for the startup index loader.
            employeeSearchRepository.save(new EmployeeDocument(
                    String.valueOf(employee.getId()), employee.getName()));
        }

        System.out.println("Development seeder completed: 2 admin accounts and 20 employee accounts are ready.");
        System.out.println("Admin test password: Admin@123 | Employee test password: Emp@123");
    }

    private record SeedAccount(String name, String email, String password,
                               Role role, String department, double salary, String phone) {
    }
}
