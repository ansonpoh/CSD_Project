package com.smu.csd.achievements;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AchievementRepository extends JpaRepository<Achievement, UUID> {
    List<Achievement> findByEventTypeAndIsActiveTrue(String eventType);

    List<Achievement> findByIsActiveTrueOrderByCreatedAtAsc();

    Optional<Achievement> findByAchievementIdAndIsActiveTrue(UUID achievementId);
}
