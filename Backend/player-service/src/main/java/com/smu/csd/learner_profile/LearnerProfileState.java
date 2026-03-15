package com.smu.csd.learner_profile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.smu.csd.learner.Learner;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
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
@Table(schema = "roles", name = "learner_profile_state")
public class LearnerProfileState {
    @Id
    @Column(name = "learner_id")
    private UUID learnerId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id")
    private Learner learner;

    @Column(name = "avatar_preset", nullable = false, length = 64)
    private String avatarPreset;

    @Column(name = "daily_quest_date_key")
    private LocalDate dailyQuestDateKey;

    @Builder.Default
    @Convert(converter = QuestProgressJsonConverter.class)
    @Column(name = "daily_quest_progress", nullable = false, columnDefinition = "text")
    private Map<String, Integer> dailyQuestProgress = new LinkedHashMap<>();

    @Column(name = "daily_quest_streak")
    private Integer dailyQuestStreak;

    @Column(name = "daily_quest_last_completed_date")
    private LocalDate dailyQuestLastCompletedDate;

    @Column(name = "learning_streak")
    private Integer learningStreak;

    @Column(name = "learning_streak_last_completed_date")
    private LocalDate learningStreakLastCompletedDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (learnerId == null && learner != null) {
            learnerId = learner.getLearnerId();
        }
        if (dailyQuestProgress == null) {
            dailyQuestProgress = new LinkedHashMap<>();
        }
        if (dailyQuestStreak == null) {
            dailyQuestStreak = 0;
        }
        if (learningStreak == null) {
            learningStreak = 0;
        }
    }
}
