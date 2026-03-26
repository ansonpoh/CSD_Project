package com.smu.csd.missions;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(schema = "missions", name = "mission")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Mission {

    public enum Type { OBSERVATION, INTERACTION }

    @Id
    @UuidGenerator
    @Column(name = "mission_id")
    private UUID missionId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Builder.Default
    @Column(name = "reward_xp", nullable = false)
    private int rewardXp = 50;

    @Builder.Default
    @Column(name = "reward_gold", nullable = false)
    private int rewardGold = 20;

    @Builder.Default
    @JsonProperty("isActive")
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
