package com.smu.csd.roles.learner_progress;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerLessonProgressRepository extends JpaRepository<LearnerLessonProgress, UUID> {
    List<LearnerLessonProgress> findByLearnerLearnerId(UUID learnerId);
    Optional<LearnerLessonProgress> findByLearnerLearnerIdAndContentId(UUID learnerId, UUID contentId);
}
