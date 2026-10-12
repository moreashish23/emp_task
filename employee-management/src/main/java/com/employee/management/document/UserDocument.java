package com.employee.management.document;

import com.employee.management.enums.Role;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class UserDocument {

    private String id;
    private String email;
    private String passwordHash;
    private Role role;
    private LocalDateTime createdAt;
    private String lastOpId;
    private Long entityVersion;
    private List<String> appliedOpHistory = new ArrayList<>();
    private Long originalMysqlId;

    public UserDocument() {
    }

    public UserDocument(String id, String email, String passwordHash, Role role,
                        LocalDateTime createdAt, String lastOpId, Long entityVersion,
                        List<String> appliedOpHistory, Long originalMysqlId) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.createdAt = createdAt;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
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
