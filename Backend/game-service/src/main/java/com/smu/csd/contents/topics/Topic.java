package com.smu.csd.contents.topics;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "contents", name = "topic")
public class Topic {
    @Id
    @Column(name = "topic_id")
    private UUID topicId;

    @Column(name = "topic_name")
    private String topicName;
}
