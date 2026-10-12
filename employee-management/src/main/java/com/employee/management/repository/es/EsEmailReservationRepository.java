package com.employee.management.repository.es;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.ElasticsearchException;
import co.elastic.clients.elasticsearch._types.Refresh;
import co.elastic.clients.elasticsearch.core.GetRequest;
import co.elastic.clients.elasticsearch.core.GetResponse;
import co.elastic.clients.elasticsearch.core.IndexRequest;
import co.elastic.clients.elasticsearch.indices.CreateIndexResponse;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import com.employee.management.document.EmailReservationDocument;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Repository
public class EsEmailReservationRepository {

    private static final Logger log = LoggerFactory.getLogger(EsEmailReservationRepository.class);

    private final ElasticsearchClient esClient;

    @Value("${elasticsearch.index.user_emails:user_emails}")
    private String indexName;

    @Value("${elasticsearch.enabled:true}")
    private boolean enabled;

    public EsEmailReservationRepository(ElasticsearchClient esClient) {
        this.esClient = esClient;
    }

    @PostConstruct
    public void init() {
        if (!enabled) return;
        try {
            ensureIndexExists();
        } catch (Exception e) {
            log.warn("Could not initialize email reservations index '{}': {}", indexName, e.getMessage());
        }
    }

    public synchronized boolean ensureIndexExists() {
        if (!enabled) return false;
        try {
            boolean exists = esClient.indices().exists(ExistsRequest.of(e -> e.index(indexName))).value();
            if (!exists) {
                log.info("Creating Elasticsearch email reservations index: {}", indexName);
                CreateIndexResponse response = esClient.indices().create(c -> c
                        .index(indexName)
                        .mappings(m -> m
                                .properties("email", p -> p.keyword(k -> k))
                                .properties("userId", p -> p.keyword(k -> k))
                                .properties("opId", p -> p.keyword(k -> k))
                                .properties("reservedAt", p -> p.date(d -> d))
                        )
                );
                return Boolean.TRUE.equals(response.acknowledged());
            }
            return true;
        } catch (Exception e) {
            log.error("Failed to ensure index '{}' exists: {}", indexName, e.getMessage());
            return false;
        }
    }

    public static String normalizeEmail(String email) {
        if (email == null) return null;
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Attempts to atomically reserve an email using op_type=create.
     * Returns true if reservation created successfully.
     * Returns false if email is already reserved (HTTP 409 conflict).
     */
    public boolean reserveEmail(String email, String userId, String opId) {
        String normalized = normalizeEmail(email);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException("Email cannot be empty");
        }
        ensureIndexExists();
        EmailReservationDocument doc = new EmailReservationDocument(normalized, userId, opId, LocalDateTime.now());

        try {
            esClient.index(IndexRequest.of(i -> i
                    .index(indexName)
                    .id(normalized)
                    .opType(co.elastic.clients.elasticsearch._types.OpType.Create)
                    .document(doc)
                    .refresh(Refresh.WaitFor)
            ));
            return true;
        } catch (ElasticsearchException e) {
            if (e.status() == 409 || "version_conflict_engine_exception".equals(e.error().type())) {
                log.debug("Email '{}' already reserved by another registration", normalized);
                return false;
            }
            throw new RuntimeException("Failed to reserve email in Elasticsearch: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure during email reservation", e);
        }
    }

    public Optional<EmailReservationDocument> getReservation(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) return Optional.empty();
        try {
            GetResponse<EmailReservationDocument> response = esClient.get(GetRequest.of(g -> g
                    .index(indexName)
                    .id(normalized)
            ), EmailReservationDocument.class);

            if (response.found() && response.source() != null) {
                return Optional.of(response.source());
            }
            return Optional.empty();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to read email reservation for '" + normalized + "': " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure reading email reservation for '" + normalized + "'", e);
        }
    }

    /**
     * Deletes reservation only if ownership check passes (intendedUserId and opId match).
     * Prevents deleting another registration's reservation.
     */
    public boolean deleteReservationIfOwned(String email, String intendedUserId, String opId) {
        String normalized = normalizeEmail(email);
        if (normalized == null) return false;

        Optional<EmailReservationDocument> existing = getReservation(normalized);
        if (existing.isEmpty()) {
            return true; // Already gone
        }

        EmailReservationDocument doc = existing.get();
        boolean isOwner = intendedUserId != null && intendedUserId.equals(doc.getUserId())
                && (opId == null || opId.equals(doc.getOpId()));

        if (!isOwner) {
            log.error("REFUSING to delete email reservation for '{}': foreign ownership detected (expected userId: {}, found: {})",
                    normalized, intendedUserId, doc.getUserId());
            return false;
        }

        try {
            esClient.delete(d -> d
                    .index(indexName)
                    .id(normalized)
                    .refresh(Refresh.WaitFor)
            );
            return true;
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404) {
                return true;
            }
            throw new RuntimeException("Failed to delete owned email reservation for '" + normalized + "': " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure deleting email reservation for '" + normalized + "'", e);
        }
    }

    public boolean deleteReservationUnconditional(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) return false;
        try {
            esClient.delete(d -> d
                    .index(indexName)
                    .id(normalized)
                    .refresh(Refresh.WaitFor)
            );
            return true;
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404) {
                return true;
            }
            throw new RuntimeException("Failed to delete email reservation unconditionally for '" + normalized + "': " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure deleting email reservation unconditionally for '" + normalized + "'", e);
        }
    }

    public long count() {
        try {
            return esClient.count(c -> c.index(indexName)).count();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return 0;
            }
            throw new RuntimeException("Failed to count email reservations in Elasticsearch: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure counting email reservations", e);
        }
    }

    public String getIndexName() {
        return indexName;
    }
}
