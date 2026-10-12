package com.employee.management.document;

import com.employee.management.enums.JournalState;

import java.time.LocalDateTime;

public class MutationJournalDocument {

    private String opId;
    private Long journalSeq;
    private String entityType;
    private String entityId;
    private Long targetVersion;
    private String opType;
    private JournalState state;
    private String payloadJson;
    private String tombstoneJson;
    private LocalDateTime createdAt;
    private LocalDateTime committedAt;
    private String failureReason;

    public MutationJournalDocument() {
    }

    public MutationJournalDocument(String opId, Long journalSeq, String entityType,
                                   String entityId, Long targetVersion, String opType,
                                   JournalState state, String payloadJson, String tombstoneJson,
                                   LocalDateTime createdAt, LocalDateTime committedAt, String failureReason) {
        this.opId = opId;
        this.journalSeq = journalSeq;
        this.entityType = entityType;
        this.entityId = entityId;
        this.targetVersion = targetVersion;
        this.opType = opType;
        this.state = state;
        this.payloadJson = payloadJson;
        this.tombstoneJson = tombstoneJson;
        this.createdAt = createdAt;
        this.committedAt = committedAt;
        this.failureReason = failureReason;
    }

    public String getOpId() {
        return opId;
    }

    public void setOpId(String opId) {
        this.opId = opId;
    }

    public Long getJournalSeq() {
        return journalSeq;
    }

    public void setJournalSeq(Long journalSeq) {
        this.journalSeq = journalSeq;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public Long getTargetVersion() {
        return targetVersion;
    }

    public void setTargetVersion(Long targetVersion) {
        this.targetVersion = targetVersion;
    }

    public String getOpType() {
        return opType;
    }

    public void setOpType(String opType) {
        this.opType = opType;
    }

    public JournalState getState() {
        return state;
    }

    public void setState(JournalState state) {
        this.state = state;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public String getTombstoneJson() {
        return tombstoneJson;
    }

    public void setTombstoneJson(String tombstoneJson) {
        this.tombstoneJson = tombstoneJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCommittedAt() {
        return committedAt;
    }

    public void setCommittedAt(LocalDateTime committedAt) {
        this.committedAt = committedAt;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
