package com.smu.csd.achievements;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

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
@Table(schema = "achievements", name = "learner_achievement")
public class LearnerAchievement {
    @Id
    @UuidGenerator
    @Column(name = "learner_achievement_id")
    private UUID learnerAchievementId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "achievement_id")
    private Achievement achievement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id")
    private Learner learner;

    @Column(name = "progess_value")
    private Integer progressValue;

    @Column(name = "is_unlocked")
    private Boolean isUnlocked;

    @Column(name = "unlocked_at")
    private LocalDateTime unlockedAt;

    @Column(name = "is_reward_claimed")
    private Boolean isRewardClaimed;

    @Column(name = "reward_claimed_at")
    private LocalDateTime rewardClaimedAt;

    @Column(name = "last_event_at")
    private LocalDateTime lastEventAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (progressValue == null || progressValue < 0) {
            progressValue = 0;
        }
        if (isUnlocked == null) {
            isUnlocked = false;
        }
        if (isRewardClaimed == null) {
            isRewardClaimed = false;
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }
}
