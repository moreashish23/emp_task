package com.employee.management.repository;

import com.employee.management.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<Employee> findByUserId(Long userId);

    List<Employee> findByIdIn(List<Long> ids);

    Page<Employee> findByDepartmentIgnoreCase(String department, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE e.id IN :ids AND LOWER(e.department) = LOWER(:department)")
    Page<Employee> findByIdInAndDepartmentIgnoreCase(@Param("ids") List<Long> ids, @Param("department") String department, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE " +
           "LOWER(e.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.department) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Employee> searchFallback(@Param("keyword") String keyword, Pageable pageable);
}
