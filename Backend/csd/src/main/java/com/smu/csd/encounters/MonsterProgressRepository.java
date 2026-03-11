package com.smu.csd.encounters;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MonsterProgressRepository extends JpaRepository<MonsterProgress, UUID> {
    Optional<MonsterProgress> findByLearnerLearnerIdAndMapMapIdAndMonsterMonsterId(
        UUID learnerId,
        UUID mapId,
        UUID monsterId
    );

    List<MonsterProgress> findAllByLearnerLearnerIdAndMapMapId(UUID learnerId, UUID mapId);

    long countByMapMapId(UUID mapId);

    long countByMapMapIdAndMonsterDefeatedTrue(UUID mapId);

    long countByMapMapIdAndRewardClaimedTrue(UUID mapId);

    long countByMapMapIdAndWinsGreaterThan(UUID mapId, Integer wins);

    long countByMapMapIdAndLossesGreaterThan(UUID mapId, Integer losses);
}
