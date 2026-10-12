package com.employee.management.repository.es;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.Refresh;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch.core.GetRequest;
import co.elastic.clients.elasticsearch.core.GetResponse;
import co.elastic.clients.elasticsearch.core.IndexRequest;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.indices.CreateIndexResponse;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import com.employee.management.document.EmployeeDocument;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class EsEmployeeRepository {

    private static final Logger log = LoggerFactory.getLogger(EsEmployeeRepository.class);

    private final ElasticsearchClient esClient;

    @Value("${elasticsearch.index.employees:${elasticsearch.index:employees}}")
    private String indexName;

    @Value("${elasticsearch.enabled:true}")
    private boolean enabled;

    public EsEmployeeRepository(ElasticsearchClient esClient) {
        this.esClient = esClient;
    }

    @PostConstruct
    public void init() {
        if (!enabled) return;
        try {
            ensureIndexExists();
        } catch (Exception e) {
            log.warn("Could not initialize employees primary index '{}': {}", indexName, e.getMessage());
        }
    }

    public synchronized boolean ensureIndexExists() {
        if (!enabled) return false;
        try {
            boolean exists = esClient.indices().exists(ExistsRequest.of(e -> e.index(indexName))).value();
            if (!exists) {
                log.info("Creating Elasticsearch employees primary index: {}", indexName);
                CreateIndexResponse response = esClient.indices().create(c -> c
                        .index(indexName)
                        .mappings(m -> m
                                .properties("id", p -> p.keyword(k -> k))
                                .properties("name", p -> p.text(t -> t.fields("keyword", f -> f.keyword(k -> k))))
                                .properties("email", p -> p.text(t -> t.fields("keyword", f -> f.keyword(k -> k))))
                                .properties("department", p -> p.text(t -> t.fields("keyword", f -> f.keyword(k -> k))))
                                .properties("salary", p -> p.scaledFloat(sf -> sf.scalingFactor(100.0)))
                                .properties("phone", p -> p.keyword(k -> k))
                                .properties("createdAt", p -> p.date(d -> d))
                                .properties("updatedAt", p -> p.date(d -> d))
                                .properties("userId", p -> p.keyword(k -> k))
                                .properties("lastOpId", p -> p.keyword(k -> k))
                                .properties("entityVersion", p -> p.long_(l -> l))
                                .properties("appliedOpHistory", p -> p.keyword(k -> k))
                                .properties("originalMysqlId", p -> p.long_(l -> l))
                        )
                );
                return Boolean.TRUE.equals(response.acknowledged());
            }
            return true;
        } catch (Exception e) {
            log.error("Failed to ensure employees index '{}' exists: {}", indexName, e.getMessage());
            return false;
        }
    }

    public EmployeeDocument saveEmployee(EmployeeDocument employee) {
        ensureIndexExists();
        if (employee.getId() == null || employee.getId().isBlank()) {
            employee.setId(UUID.randomUUID().toString());
        }
        if (employee.getEntityVersion() == null) {
            employee.setEntityVersion(1L);
        }

        try {
            esClient.index(IndexRequest.of(i -> i
                    .index(indexName)
                    .id(employee.getId())
                    .document(employee)
                    .refresh(Refresh.WaitFor)
            ));
            return employee;
        } catch (Exception e) {
            throw new RuntimeException("Failed to persist employee in Elasticsearch: " + e.getMessage(), e);
        }
    }

    public Optional<EmployeeDocument> findById(String id) {
        if (id == null) return Optional.empty();
        try {
            GetResponse<EmployeeDocument> res = esClient.get(GetRequest.of(g -> g
                    .index(indexName)
                    .id(id)
            ), EmployeeDocument.class);

            if (res.found() && res.source() != null) {
                return Optional.of(res.source());
            }
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() != 404 || e.error() == null || !"index_not_found_exception".equals(e.error().type())) {
                throw new RuntimeException("Failed to fetch employee by id '" + id + "': " + e.getMessage(), e);
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure fetching employee by id '" + id + "'", e);
        }

        if (id.matches("\\d+")) {
            return findByOriginalMysqlId(Long.parseLong(id));
        }

        return Optional.empty();
    }

    public Optional<EmployeeDocument> findByOriginalMysqlId(Long originalMysqlId) {
        if (originalMysqlId == null) return Optional.empty();
        try {
            SearchResponse<EmployeeDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .query(q -> q.term(t -> t.field("originalMysqlId").value(originalMysqlId)))
                    .size(1)
            ), EmployeeDocument.class);

            if (!res.hits().hits().isEmpty() && res.hits().hits().get(0).source() != null) {
                return Optional.of(res.hits().hits().get(0).source());
            }
            return Optional.empty();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to find employee by originalMysqlId '" + originalMysqlId + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure finding employee by originalMysqlId '" + originalMysqlId + "'", e);
        }
    }

    public Optional<EmployeeDocument> findByEmail(String email) {
        if (email == null) return Optional.empty();
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        try {
            SearchResponse<EmployeeDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .query(q -> q.term(t -> t.field("email.keyword").value(normalized)))
                    .size(1)
            ), EmployeeDocument.class);

            if (!res.hits().hits().isEmpty() && res.hits().hits().get(0).source() != null) {
                return Optional.of(res.hits().hits().get(0).source());
            }
            return Optional.empty();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to find employee by email '" + normalized + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure finding employee by email '" + normalized + "'", e);
        }
    }

    public Optional<EmployeeDocument> findByUserId(String userId) {
        if (userId == null) return Optional.empty();
        try {
            SearchResponse<EmployeeDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .query(q -> q.term(t -> t.field("userId").value(userId)))
                    .size(1)
            ), EmployeeDocument.class);

            if (!res.hits().hits().isEmpty() && res.hits().hits().get(0).source() != null) {
                return Optional.of(res.hits().hits().get(0).source());
            }
            return Optional.empty();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to find employee by userId '" + userId + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure finding employee by userId '" + userId + "'", e);
        }
    }

    public boolean deleteById(String id) {
        if (id == null) return false;
        try {
            esClient.delete(d -> d
                    .index(indexName)
                    .id(id)
                    .refresh(Refresh.WaitFor)
            );
            return true;
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404) {
                return false;
            }
            throw new RuntimeException("Failed to delete employee '" + id + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure deleting employee '" + id + "'", e);
        }
    }

    public Page<EmployeeDocument> search(String keyword, Pageable pageable) {
        try {
            SearchResponse<EmployeeDocument> res = esClient.search(SearchRequest.of(s -> {
                s.index(indexName)
                        .from((int) pageable.getOffset())
                        .size(pageable.getPageSize());

                if (keyword != null && !keyword.trim().isEmpty()) {
                    String clean = keyword.trim();
                    s.query(q -> q.bool(b -> b
                            .should(sh -> sh.wildcard(w -> w.field("name.keyword").wildcard("*" + clean + "*").caseInsensitive(true)))
                            .should(sh -> sh.wildcard(w -> w.field("email.keyword").wildcard("*" + clean + "*").caseInsensitive(true)))
                            .should(sh -> sh.wildcard(w -> w.field("department.keyword").wildcard("*" + clean + "*").caseInsensitive(true)))
                            .should(sh -> sh.wildcard(w -> w.field("name").wildcard("*" + clean.toLowerCase() + "*")))
                            .should(sh -> sh.wildcard(w -> w.field("email").wildcard("*" + clean.toLowerCase() + "*")))
                            .should(sh -> sh.wildcard(w -> w.field("department").wildcard("*" + clean.toLowerCase() + "*")))
                    ));
                } else {
                    s.query(q -> q.matchAll(m -> m));
                }

                s.sort(so -> so.field(f -> f.field("createdAt").order(SortOrder.Desc)));
                return s;
            }), EmployeeDocument.class);

            List<EmployeeDocument> list = new ArrayList<>();
            res.hits().hits().forEach(h -> {
                if (h.source() != null) list.add(h.source());
            });

            long total = res.hits().total() != null ? res.hits().total().value() : list.size();
            return new PageImpl<>(list, pageable, total);
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return new PageImpl<>(Collections.emptyList(), pageable, 0);
            }
            throw new RuntimeException("Failed to search employees in Elasticsearch: " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure searching employees", e);
        }
    }

    public long count() {
        try {
            return esClient.count(c -> c.index(indexName)).count();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return 0;
            }
            throw new RuntimeException("Failed to count employees in Elasticsearch: " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure counting employees", e);
        }
    }

    public List<EmployeeDocument> findAll(int page, int size) {
        try {
            SearchResponse<EmployeeDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .from(page * size)
                    .size(size)
            ), EmployeeDocument.class);

            List<EmployeeDocument> list = new ArrayList<>();
            res.hits().hits().forEach(h -> {
                if (h.source() != null) list.add(h.source());
            });
            return list;
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Collections.emptyList();
            }
            throw new RuntimeException("Failed to fetch all employees from Elasticsearch: " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure fetching all employees", e);
        }
    }

    public String getIndexName() {
        return indexName;
    }
}
