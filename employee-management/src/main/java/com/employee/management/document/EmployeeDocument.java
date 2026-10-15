package com.employee.management.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

@Document(indexName = "employees")
@Setting(useServerConfiguration = true)
public class EmployeeDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text)
    private String name;

    public EmployeeDocument() {
    }

    public EmployeeDocument(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
