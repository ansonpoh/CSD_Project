package com.smu.csd.learner;

import java.time.OffsetDateTime;
import java.util.UUID;

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
@Table(schema = "roles", name = "learner_xp")
public class LearnerXp {

    @Id
    @Column(name = "learner_xp_id")
    private UUID learnerXpId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id")
    private Learner learner;

    @Column(name = "xp_delta")
    private Integer xpDelta;

    @Column(name = "xp_before")
    private Integer xpBefore;

    @Column(name = "xp_after")
    private Integer xpAfter;

    @Column(name = "source_type")
    private String sourceType;

    /** DB column is spelled {@code occured_at}. */
    @Column(name = "occured_at")
    private OffsetDateTime occurredAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (learnerXpId == null) {
            learnerXpId = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (occurredAt == null) {
            occurredAt = now;
        }
    }
}
