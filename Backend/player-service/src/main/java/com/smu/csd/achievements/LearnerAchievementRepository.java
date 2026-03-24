package com.smu.csd.achievements;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerAchievementRepository extends JpaRepository<LearnerAchievement, UUID> {
    Optional<LearnerAchievement> findByLearnerLearnerIdAndAchievementAchievementId(UUID learnerId, UUID achievementId);
    List<LearnerAchievement> findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
        UUID learnerId,
        UUID achievementId
    );

    @EntityGraph(attributePaths = "achievement")
    List<LearnerAchievement> findByLearnerLearnerId(UUID learnerId);
}
