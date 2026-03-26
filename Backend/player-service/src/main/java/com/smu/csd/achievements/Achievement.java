package com.smu.csd.achievements;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

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
@Table(schema = "achievements", name = "achievement")
public class Achievement {
    @Id
    @UuidGenerator
    @Column(name = "achievement_id")
    private UUID achievementId;

    @Column
    private String name;

    @Column
    private String description;

    @Column
    private String category;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "progress_type")
    private String progressType;

    @Column(name = "target_value")
    private Integer targetValue;

    @Column(name = "reward_xp")
    private Integer rewardXp;

    @Column(name = "reward_gold")
    private Integer rewardGold;

    @Column(name = "is_hidden")
    private Boolean isHidden;

    @Column(name = "is_active")
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
