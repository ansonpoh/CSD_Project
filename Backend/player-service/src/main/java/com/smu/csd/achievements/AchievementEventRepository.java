package com.smu.csd.achievements;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AchievementEventRepository extends JpaRepository<AchievementEvent, UUID> {
    boolean existsByIdempotencyKey(String idempotencyKey);
}
