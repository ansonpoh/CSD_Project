package com.smu.csd.missions;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(schema = "missions", name = "mission_attempt")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MissionAttempt {

    public enum Status { PENDING, APPROVED, REJECTED, FLAGGED_FOR_REVIEW }

    @Id
    @UuidGenerator
    @Column(name = "attempt_id")
    private UUID attemptId;

    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reflection;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private Status status = Status.PENDING;

    @Column(name = "ai_review_note", columnDefinition = "TEXT")
    private String aiReviewNote;

    @Builder.Default
    @Column(name = "reward_claimed", nullable = false)
    private boolean rewardClaimed = false;
}
