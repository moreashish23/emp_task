package com.employee.management.repository.es;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.Refresh;
import co.elastic.clients.elasticsearch.core.GetRequest;
import co.elastic.clients.elasticsearch.core.GetResponse;
import co.elastic.clients.elasticsearch.core.IndexRequest;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.indices.CreateIndexResponse;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import com.employee.management.document.UserDocument;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class EsUserRepository {

    private static final Logger log = LoggerFactory.getLogger(EsUserRepository.class);

    private final ElasticsearchClient esClient;

    @Value("${elasticsearch.index.users:users}")
    private String indexName;

    @Value("${elasticsearch.enabled:true}")
    private boolean enabled;

    public EsUserRepository(ElasticsearchClient esClient) {
        this.esClient = esClient;
    }

    @PostConstruct
    public void init() {
        if (!enabled) return;
        try {
            ensureIndexExists();
        } catch (Exception e) {
            log.warn("Could not initialize users index '{}': {}", indexName, e.getMessage());
        }
    }

    public synchronized boolean ensureIndexExists() {
        if (!enabled) return false;
        try {
            boolean exists = esClient.indices().exists(ExistsRequest.of(e -> e.index(indexName))).value();
            if (!exists) {
                log.info("Creating Elasticsearch users index: {}", indexName);
                CreateIndexResponse response = esClient.indices().create(c -> c
                        .index(indexName)
                        .mappings(m -> m
                                .properties("id", p -> p.keyword(k -> k))
                                .properties("email", p -> p.keyword(k -> k))
                                .properties("passwordHash", p -> p.keyword(k -> k))
                                .properties("role", p -> p.keyword(k -> k))
                                .properties("createdAt", p -> p.date(d -> d))
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
            log.error("Failed to ensure users index '{}' exists: {}", indexName, e.getMessage());
            return false;
        }
    }

    public UserDocument saveUser(UserDocument user) {
        ensureIndexExists();
        if (user.getId() == null || user.getId().isBlank()) {
            user.setId(UUID.randomUUID().toString());
        }
        if (user.getEntityVersion() == null) {
            user.setEntityVersion(1L);
        }

        try {
            esClient.index(IndexRequest.of(i -> i
                    .index(indexName)
                    .id(user.getId())
                    .document(user)
                    .refresh(Refresh.WaitFor)
            ));
            return user;
        } catch (Exception e) {
            throw new RuntimeException("Failed to persist user in Elasticsearch: " + e.getMessage(), e);
        }
    }

    public Optional<UserDocument> findById(String id) {
        if (id == null) return Optional.empty();
        try {
            GetResponse<UserDocument> res = esClient.get(GetRequest.of(g -> g
                    .index(indexName)
                    .id(id)
            ), UserDocument.class);

            if (res.found() && res.source() != null) {
                return Optional.of(res.source());
            }
            return Optional.empty();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to fetch user by id '" + id + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure fetching user by id '" + id + "'", e);
        }
    }

    public Optional<UserDocument> findByEmail(String email) {
        if (email == null) return Optional.empty();
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        try {
            SearchResponse<UserDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .query(q -> q.term(t -> t.field("email").value(normalized)))
                    .size(1)
            ), UserDocument.class);

            if (!res.hits().hits().isEmpty() && res.hits().hits().get(0).source() != null) {
                return Optional.of(res.hits().hits().get(0).source());
            }
            return Optional.empty();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Optional.empty();
            }
            throw new RuntimeException("Failed to find user by email '" + normalized + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure finding user by email '" + normalized + "'", e);
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
            throw new RuntimeException("Failed to delete user '" + id + "': " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure deleting user '" + id + "'", e);
        }
    }

    public long count() {
        try {
            return esClient.count(c -> c.index(indexName)).count();
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return 0;
            }
            throw new RuntimeException("Failed to count users in Elasticsearch: " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure counting users", e);
        }
    }

    public List<UserDocument> findAll(int page, int size) {
        try {
            SearchResponse<UserDocument> res = esClient.search(SearchRequest.of(s -> s
                    .index(indexName)
                    .from(page * size)
                    .size(size)
            ), UserDocument.class);

            List<UserDocument> list = new ArrayList<>();
            res.hits().hits().forEach(h -> {
                if (h.source() != null) list.add(h.source());
            });
            return list;
        } catch (co.elastic.clients.elasticsearch._types.ElasticsearchException e) {
            if (e.status() == 404 && e.error() != null && "index_not_found_exception".equals(e.error().type())) {
                return Collections.emptyList();
            }
            throw new RuntimeException("Failed to fetch all users from Elasticsearch: " + e.getMessage(), e);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Elasticsearch communication failure fetching all users", e);
        }
    }

    public String getIndexName() {
        return indexName;
    }
}
