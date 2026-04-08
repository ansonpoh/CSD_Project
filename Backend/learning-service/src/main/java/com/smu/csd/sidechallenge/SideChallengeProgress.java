package com.smu.csd.sidechallenge;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
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
@Table(schema = "side_challenge", name = "learner_side_challenge_progress")
public class SideChallengeProgress {
    @EmbeddedId
    private SideChallengeProgressId id;

    @Column(name = "attempts")
    private Integer attempts;

    @Column(name = "completed")
    private Boolean completed;

    @Column(name = "last_result")
    private String lastResult;

    @Column(name = "first_completed_at")
    private LocalDateTime firstCompletedAt;

    @Column(name = "last_completed_at")
    private LocalDateTime lastCompletedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
