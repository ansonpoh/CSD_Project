package com.smu.csd.missions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MissionAttemptRepository extends JpaRepository<MissionAttempt, UUID> {

    @EntityGraph(attributePaths = "mission")
    List<MissionAttempt> findByStatus(MissionAttempt.Status status);

    @EntityGraph(attributePaths = "mission")
    List<MissionAttempt> findByLearnerIdAndSubmittedAtAfter(UUID learnerId, LocalDateTime startDate);

    @EntityGraph(attributePaths = "mission")
    Optional<MissionAttempt> findByLearnerIdAndMission_MissionId(UUID learnerId, UUID missionId);
}
