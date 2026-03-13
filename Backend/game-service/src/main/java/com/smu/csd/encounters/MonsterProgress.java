package com.smu.csd.encounters;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.maps.Map;
import com.smu.csd.monsters.Monster;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(schema = "encounters", name = "monster_progress")
public class MonsterProgress {
    @Id
    @UuidGenerator
    @Column(name = "monster_progress_id")
    private UUID monsterProgressId;

    @Column(name = "learner_id")
    private UUID learnerId;

    @ManyToOne
    @JoinColumn(name = "map_id")
    private Map map;

    @ManyToOne
    @JoinColumn(name = "monster_id")
    private Monster monster;

    @Column
    private Integer attempts;

    @Column
    private Integer wins;

    @Column
    private Integer losses;

    @Column(name = "loss_streak")
    private Integer lossStreak;

    @Column(name = "monster_defeated")
    private Boolean monsterDefeated;

    @Column(name = "defeated_at")
    private LocalDateTime defeatedAt;

    @Column(name = "reward_claimed")
    private Boolean rewardClaimed;

    @Column(name = "reward_claimed_at")
    private LocalDateTime rewardClaimedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}