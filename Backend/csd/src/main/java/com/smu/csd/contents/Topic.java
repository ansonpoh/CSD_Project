package com.smu.csd.contents;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "contents", name = "topic")
public class Topic {

    @Id
    @UuidGenerator
    @Column(name = "topic_id")
    private UUID contributorId;

    @Column(name = "topic_name")
    private String topicName;

    @Column(name = "description")
    private String description;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
