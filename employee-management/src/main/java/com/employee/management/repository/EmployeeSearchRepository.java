package com.employee.management.repository;

import com.employee.management.document.EmployeeDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface EmployeeSearchRepository extends ElasticsearchRepository<EmployeeDocument, String> {
    Page<EmployeeDocument> findByNameContainingIgnoreCase(String name, Pageable pageable);
    List<EmployeeDocument> findByNameContainingIgnoreCase(String name);
}
