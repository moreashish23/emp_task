package com.employee.management.document;

import java.time.LocalDateTime;

public class EmailReservationDocument {

    private String email;
    private String userId;
    private String opId;
    private LocalDateTime reservedAt;

    public EmailReservationDocument() {
    }

    public EmailReservationDocument(String email, String userId, String opId, LocalDateTime reservedAt) {
        this.email = email;
        this.userId = userId;
        this.opId = opId;
        this.reservedAt = reservedAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getOpId() {
        return opId;
    }

    public void setOpId(String opId) {
        this.opId = opId;
    }

    public LocalDateTime getReservedAt() {
        return reservedAt;
    }

    public void setReservedAt(LocalDateTime reservedAt) {
        this.reservedAt = reservedAt;
    }
}
