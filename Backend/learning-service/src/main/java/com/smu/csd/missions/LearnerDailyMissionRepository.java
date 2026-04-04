package com.smu.csd.missions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LearnerDailyMissionRepository extends JpaRepository<LearnerDailyMission, UUID> {

    @EntityGraph(attributePaths = "mission")
    List<LearnerDailyMission> findByLearnerIdAndAssignedDate(UUID learnerId, LocalDate date);

    long countByLearnerIdAndAssignedDateAndStatus(UUID learnerId, LocalDate date, LearnerDailyMission.Status status);
}
