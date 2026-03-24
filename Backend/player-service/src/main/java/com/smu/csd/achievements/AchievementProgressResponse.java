package com.smu.csd.achievements;

import java.time.LocalDateTime;
import java.util.UUID;

public record AchievementProgressResponse(
    UUID achievementId,
    String name,
    String description,
    String category,
    String eventType,
    String progressType,
    Integer targetValue,
    Integer rewardXp,
    Integer rewardGold,
    Boolean isHidden,
    Boolean isActive,
    Integer progressValue,
    Boolean isUnlocked,
    LocalDateTime unlockedAt,
    Boolean isRewardClaimed,
    LocalDateTime rewardClaimedAt,
    LocalDateTime lastEventAt
) {}
