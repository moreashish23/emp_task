package com.employee.management.document;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class EmployeeDocument {

    private String id;
    private String name;
    private String email;
    private String department;
    private BigDecimal salary;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String userId;
    private String lastOpId;
    private Long entityVersion;
    private List<String> appliedOpHistory = new ArrayList<>();
    private Long originalMysqlId;

    public EmployeeDocument() {
    }

    public EmployeeDocument(String id, String name, String email, String department,
                            BigDecimal salary, String phone, LocalDateTime createdAt,
                            LocalDateTime updatedAt, String userId, String lastOpId,
                            Long entityVersion, List<String> appliedOpHistory, Long originalMysqlId) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.department = department;
        setSalary(salary);
        this.phone = phone;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.userId = userId;
        this.lastOpId = lastOpId;
        this.entityVersion = entityVersion;
        if (appliedOpHistory != null) {
            this.appliedOpHistory = new ArrayList<>(appliedOpHistory);
        }
        this.originalMysqlId = originalMysqlId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public BigDecimal getSalary() {
        return salary;
    }

    public void setSalary(BigDecimal salary) {
        if (salary != null) {
            this.salary = salary.setScale(2, RoundingMode.HALF_UP);
        } else {
            this.salary = null;
        }
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getLastOpId() {
        return lastOpId;
    }

    public void setLastOpId(String lastOpId) {
        this.lastOpId = lastOpId;
    }

    public Long getEntityVersion() {
        return entityVersion;
    }

    public void setEntityVersion(Long entityVersion) {
        this.entityVersion = entityVersion;
    }

    public List<String> getAppliedOpHistory() {
        return appliedOpHistory;
    }

    public void setAppliedOpHistory(List<String> appliedOpHistory) {
        this.appliedOpHistory = appliedOpHistory != null ? new ArrayList<>(appliedOpHistory) : new ArrayList<>();
    }

    public Long getOriginalMysqlId() {
        return originalMysqlId;
    }

    public void setOriginalMysqlId(Long originalMysqlId) {
        this.originalMysqlId = originalMysqlId;
    }
}
