package com.smu.csd.learner;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface LearnerXpLogRepository extends JpaRepository<LearnerXpLog, UUID> {
    List<LearnerXpLog> findByLearnerIdAndAwardedAtAfter(UUID learnerId, LocalDateTime startDate);
}