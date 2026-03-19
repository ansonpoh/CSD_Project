package com.smu.csd.achievements;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import com.smu.csd.learner.Learner;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
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
@Table(schema = "achievements", name = "achievement_event")
public class AchievementEvent {
    @Id
    @UuidGenerator
    @Column(name = "achievement_event_id")
    private UUID achievementEventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id")
    private Learner learner;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "event_value")
    private Integer eventValue;

    @Column(name = "source_service")
    private String sourceService;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", columnDefinition = "jsonb")
    private Map<String, Object> payloadJson;

    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;

    @PrePersist
    void prePersist() {
        if (eventValue == null || eventValue < 1) {
            eventValue = 1;
        }
        if (payloadJson == null) {
            payloadJson = new LinkedHashMap<>();
        }
        if (occurredAt == null) {
            occurredAt = LocalDateTime.now();
        }
    }
}
