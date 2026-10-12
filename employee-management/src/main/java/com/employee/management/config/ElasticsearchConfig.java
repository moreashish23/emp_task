package com.employee.management.config;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest5_client.Rest5ClientTransport;
import co.elastic.clients.transport.rest5_client.low_level.Rest5Client;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.core5.http.HttpHost;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
public class ElasticsearchConfig {

    private static final Logger log = LoggerFactory.getLogger(ElasticsearchConfig.class);

    @Value("${elasticsearch.url:http://localhost:9200}")
    private String elasticsearchUrl;

    @Bean(destroyMethod = "close")
    public Rest5Client rest5Client() {
        try {
            URI uri = URI.create(elasticsearchUrl);
            String scheme = uri.getScheme() != null ? uri.getScheme() : "http";
            String host = uri.getHost() != null ? uri.getHost() : "localhost";
            int port = uri.getPort() != -1 ? uri.getPort() : 9200;

            log.info("Configuring Elasticsearch Rest5Client for host: {}:{} ({})", host, port, scheme);
            return Rest5Client.builder(new HttpHost(scheme, host, port)).build();
        } catch (Exception e) {
            log.error("Failed to parse Elasticsearch URL: {}, falling back to http://localhost:9200", elasticsearchUrl, e);
            return Rest5Client.builder(new HttpHost("http", "localhost", 9200)).build();
        }
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }

    @Bean
    public ElasticsearchClient elasticsearchClient(Rest5Client rest5Client, ObjectMapper objectMapper) {
        JacksonJsonpMapper jsonpMapper = new JacksonJsonpMapper(objectMapper);
        ElasticsearchTransport transport = new Rest5ClientTransport(rest5Client, jsonpMapper);
        return new ElasticsearchClient(transport);
    }
}
