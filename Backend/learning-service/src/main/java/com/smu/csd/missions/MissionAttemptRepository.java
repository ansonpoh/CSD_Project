package com.smu.csd.missions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MissionAttemptRepository extends JpaRepository<MissionAttempt, UUID> {

    List<MissionAttempt> findByStatus(MissionAttempt.Status status);

    Optional<MissionAttempt> findByLearnerIdAndMission_MissionId(UUID learnerId, UUID missionId);
}
