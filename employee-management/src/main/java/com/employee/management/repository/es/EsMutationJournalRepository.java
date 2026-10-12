package com.employee.management.repository.es;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.ElasticsearchException;
import co.elastic.clients.elasticsearch._types.Refresh;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch.core.GetRequest;
import co.elastic.clients.elasticsearch.core.GetResponse;
import co.elastic.clients.elasticsearch.core.IndexRequest;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.indices.CreateIndexResponse;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import com.employee.management.document.MutationJournalDocument;
import com.employee.management.enums.JournalState;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Repository
public class EsMutationJournalRepository {

    private static final Logger log = LoggerFactory.getLogger(EsMutationJournalRepository.class);

    private final ElasticsearchClient esClient;

    @Value("${elasticsearch.index.mutation_journal:mutation_journal}")
    private String indexName;

    @Value("${elasticsearch.enabled:true}")
    private boolean enabled;

    public EsMutationJournalRepository(ElasticsearchClient esClient) {
        this.esClient = esClient;
    }

    @PostConstruct
    public void init() {
        if (!enabled) return;
        try {
            ensureIndexExists();
        } catch (Exception e) {
            log.warn("Could not initialize mutation journal index '{}': {}", indexName, e.getMessage());
        }
    }

    public synchronized boolean ensureIndexExists() {
        if (!enabled) return false;
        try {
            boolean exists = esClient.indices().exists(ExistsRequest.of(e -> e.index(indexName))).value();
            if (!exists) {
                log.info("Creating Elasticsearch mutation journal index: {}", indexName);
                CreateIndexResponse response = esClient.indices().create(c -> c
                        .index(indexName)
                        .mappings(m -> m
                                .properties("opId", p -> p.keyword(k -> k))
                                .properties("journalSeq", p -> p.long_(l -> l))
                                .properties("entityType", p -> p.keyword(k -> k))
                                .properties("entityId", p -> p.keyword(k -> k))
                                .properties("targetVersion", p -> p.long_(l -> l))
                                .properties("opType", p -> p.keyword(k -> k))
                                .properties("state", p -> p.keyword(k -> k))
                                .properties("payloadJson", p -> p.text(t -> t.index(false)))
                                .properties("tombstoneJson", p -> p.text(t -> t.index(false)))
                                .properties("createdAt", p -> p.date(d -> d))
                                .properties("committedAt", p -> p.date(d -> d))
                                .properties("failureReason", p -> p.text(t -> t))
                        )
                );
                return Boolean.TRUE.equals(response.acknowledged());
            }
            return true;
        } catch (Exception e) {
            log.error("Failed to ensure journal index '{}' exists: {}", indexName, e.getMessage());
            return false;
        }
    }

    public synchronized long nextSeq() {
        ensureIndexExists();
        for (int attempt = 0; attempt < 5; attempt++) {
            try {
                GetResponse<JournalSequenceDoc> get = esClient.get(g -> g
                        .index(indexName)
                        .id("__journal_sequence__")
                , JournalSequenceDoc.class);

                if (get.found() && get.source() != null && get.source().getCurrentSeq() != null) {
                    long next = get.source().getCurrentSeq() + 1L;
                    esClient.index(IndexRequest.of(i -> i
                            .index(indexName)
                            .id("__journal_sequence__")
                            .document(new JournalSequenceDoc(next))
                            .ifSeqNo(get.seqNo())
                            .ifPrimaryTerm(get.primaryTerm())
                            .refresh(Refresh.WaitFor)
                    ));
                    return next;
                } else {
                    long maxExisting = getMaxJournalSeq();
                    long next = maxExisting > 0 ? maxExisting + 1L : 1L;
                    try {
                        esClient.index(IndexRequest.of(i -> i
                                .index(indexName)
                                .id("__journal_sequence__")
                                .document(new JournalSequenceDoc(next))
                                .opType(co.elastic.clients.elasticsearch._types.OpType.Create)
                                .refresh(Refresh.WaitFor)
                        ));
                        return next;
                    } catch (ElasticsearchException e) {
                        if (e.status() == 409 || (e.error() != null && "version_conflict_engine_exception".equals(e.error().type()))) {
                            continue;
                        }
                        throw e;
                    }
                }
            } catch (ElasticsearchException e) {
                if (e.status() == 409 || (e.error() != null && "version_conflict_engine_exception".equals(e.error().type()))) {
                    continue;
                }
                throw new RuntimeException("Failed to generate durable mutation journal sequence: " + e.getMessage(), e);
            } catch (IOException e) {
                throw new RuntimeException("Elasticsearch communication failure during sequence generation: " + e.getMessage(), e);
            }
        }
        throw new RuntimeException("Exceeded maximum retries generating durable journal sequence");
    }

    private long getMaxJournalSeq() {
        try {
            SearchResponse<MutationJournalDocument> res = esClient.search(s -> s
                    .index(indexName)
                    .size(1)
                    .sort(so -> so.field(f -> f.field("journalSeq").order(SortOrder.Desc)))
            , MutationJournalDocument.class);

            if (!res.hits().hits().isEmpty() && res.hits().hits().get(0).source() != null) {
                Long seq = res.hits().hits().get(0).source().getJournalSeq();
                return seq != null ? seq : 0L;
            }
        } catch (Exception e) {
            log.warn("Could not determine max existing journal sequence: {}", e.getMessage());
        }
        return 0L;
    }

    public long getCurrentSequence() {
        try {
            GetResponse<JournalSequenceDoc> get = esClient.get(g -> g
                    .index(indexName)
                    .id("__journal_sequence__")
            , JournalSequenceDoc.class);
            if (get.found() && get.source() != null && get.source().getCurrentSeq() != null) {
                return get.source().getCurrentSeq();
            }
        } catch (Exception ignored) {}
        return getMaxJournalSeq();
    }

    public MutationJournalDocument recordPending(String opId, String entityType, String entityId,
                                                  Long targetVersion, String opType,
                                                  String payloadJson, String tombstoneJson) {
        ensureIndexExists();
        long seq = nextSeq();
        MutationJournalDocument doc = new MutationJournalDocument(
                opId,
                seq,
                entityType,
                entityId,
                targetVersion,
                opType,
                JournalState.PENDING,
                payloadJson,
                tombstoneJson,
                LocalDateTime.now(),
                null,
                null
        );

        try {
            esClient.index(IndexRequest.of(i -> i
                    .index(indexName)
                    .id(opId)
                    .document(doc)
                    .refresh(Refresh.WaitFor)
            ));
            return doc;
        } catch (Exception e) {
            throw new RuntimeException("Failed to persist PENDING mutation journal entry: " + e.getMessage(), e);
        }
    }

    public void updateState(String opId, JournalState newState, String failureReason) {
        Optional<MutationJournalDocument> opt = findById(opId);
        if (opt.isEmpty()) {
            log.warn("Cannot transition state of non-existent journal op: {}", opId);
            return;
        }
        MutationJournalDocument doc = opt.get();
        doc.setState(newState);
        if (newState == JournalState.COMMITTED) {
            doc.setCommittedAt(LocalDateTime.now());
        }
        if (failureReason != null) {
            doc.setFailureReason(failureReason);
        }

        try {
            esClient.index(IndexRequest.of(i -> i
                    .index(indexName)
                    .id(opId)
                    .document(doc)
                    .refresh(Refresh.WaitFor)
            ));
        } catch (ElasticsearchException e) {
            throw new RuntimeException("Failed to update journal op '" + opId + "' to state " + newState + ": " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure updating journal op '" + opId + "'", e);
        }
    }

    public void markCommitted(String opId) {
        updateState(opId, JournalState.COMMITTED, null);
    }

    public void markCompensating(String opId) {
        updateState(opId, JournalState.COMPENSATING, null);
    }

    public void markFailed(String opId, String reason) {
        updateState(opId, JournalState.FAILED, reason);
    }

    public void markIndeterminate(String opId, String alert) {
        updateState(opId, JournalState.INDETERMINATE, alert);
    }

    public Optional<MutationJournalDocument> findById(String opId) {
        try {
            GetResponse<MutationJournalDocument> res = esClient.get(GetRequest.of(g -> g
                    .index(indexName)
                    .id(opId)
            ), MutationJournalDocument.class);

            if (res.found() && res.source() != null) {
                return Optional.of(res.source());
            }
            return Optional.empty();
        } catch (ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to fetch journal entry '" + opId + "': " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure fetching journal entry '" + opId + "'", e);
        }
    }

    public List<MutationJournalDocument> findCommittedSinceSeq(long afterSeq, int limit) {
        try {
            SearchResponse<MutationJournalDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .query(q -> q
                            .bool(b -> b
                                    .filter(f -> f.term(t -> t.field("state").value(JournalState.COMMITTED.name())))
                                    .filter(f -> f.range(r -> r.number(n -> n.field("journalSeq").gt((double) afterSeq))))
                            )
                    )
                    .sort(so -> so.field(f -> f.field("journalSeq").order(SortOrder.Asc)))
                    .size(limit)
            ), MutationJournalDocument.class);

            List<MutationJournalDocument> list = new ArrayList<>();
            res.hits().hits().forEach(h -> {
                if (h.source() != null) {
                    list.add(h.source());
                }
            });
            return list;
        } catch (ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Collections.emptyList();
            }
            throw new RuntimeException("Failed to query committed journal entries: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure querying committed journal entries", e);
        }
    }

    public List<MutationJournalDocument> findAllSinceSeq(long afterSeq, int limit) {
        try {
            SearchResponse<MutationJournalDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .query(q -> q
                            .range(r -> r.number(n -> n.field("journalSeq").gt((double) afterSeq)))
                    )
                    .sort(so -> so.field(f -> f.field("journalSeq").order(SortOrder.Asc)))
                    .size(limit)
            ), MutationJournalDocument.class);

            List<MutationJournalDocument> list = new ArrayList<>();
            res.hits().hits().forEach(h -> {
                if (h.source() != null) {
                    list.add(h.source());
                }
            });
            return list;
        } catch (ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Collections.emptyList();
            }
            throw new RuntimeException("Failed to query journal entries: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure querying journal entries", e);
        }
    }

    public long count() {
        try {
            return esClient.count(c -> c.index(indexName)).count();
        } catch (ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return 0;
            }
            throw new RuntimeException("Failed to count mutation journal documents: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new RuntimeException("Elasticsearch communication failure counting journal documents", e);
        }
    }

    public String getIndexName() {
        return indexName;
    }

    public static class JournalSequenceDoc {
        private Long currentSeq;

        public JournalSequenceDoc() {}

        public JournalSequenceDoc(Long currentSeq) {
            this.currentSeq = currentSeq;
        }

        public Long getCurrentSeq() {
            return currentSeq;
        }

        public void setCurrentSeq(Long currentSeq) {
            this.currentSeq = currentSeq;
        }
    }
}
