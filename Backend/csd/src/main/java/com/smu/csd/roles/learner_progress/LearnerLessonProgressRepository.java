package com.smu.csd.roles.learner_progress;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearnerLessonProgressRepository extends JpaRepository<LearnerLessonProgress, UUID> {
    List<LearnerLessonProgress> findByLearnerLearnerId(UUID learnerId);
    Optional<LearnerLessonProgress> findByLearnerLearnerIdAndContentId(UUID learnerId, UUID contentId);

    boolean existsByLearnerLearnerIdAndNpcIdAndStatus(
        UUID learnerId,
        UUID npcId,
        LearnerLessonProgress.Status status
    );

    long countByLearnerLearnerIdAndNpcIdInAndStatus(
        UUID learnerId,
        Collection<UUID> npcIds,
        LearnerLessonProgress.Status status
    );

    long countByNpcIdInAndStatus(Collection<UUID> npcIds, LearnerLessonProgress.Status status);

    long countByStatusAndNpcIdIsNotNull(LearnerLessonProgress.Status status);

    @Query("select count(distinct p.learner.learnerId) from LearnerLessonProgress p where p.status = :status and p.npcId is not null")
    long countDistinctLearnersByStatusAndNpcIdIsNotNull(@Param("status") LearnerLessonProgress.Status status);

    @Query("select count(distinct p.learner.learnerId) from LearnerLessonProgress p where p.status = :status and p.npcId in :npcIds")
    long countDistinctLearnersByNpcIdInAndStatus(
        @Param("npcIds") Collection<UUID> npcIds,
        @Param("status") LearnerLessonProgress.Status status
    );
}
