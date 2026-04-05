package com.smu.csd.encounters;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MonsterProgressRepository extends JpaRepository<MonsterProgress, UUID> {
    Optional<MonsterProgress> findByLearnerIdAndMapMapIdAndMonsterMonsterId(
        UUID learnerId,
        UUID mapId,
        UUID monsterId
    );

    List<MonsterProgress> findAllByLearnerIdAndMapMapId(UUID learnerId, UUID mapId);

    long countByAttemptsGreaterThan(Integer attempts);

    long countByWinsGreaterThan(Integer wins);

    long countByLossesGreaterThan(Integer losses);

    long countByRewardClaimedTrue();

    long countByMapMapId(UUID mapId);

    long countByMapMapIdAndAttemptsGreaterThan(UUID mapId, Integer attempts);

    long countByMapMapIdAndMonsterDefeatedTrue(UUID mapId);

    long countByMapMapIdAndRewardClaimedTrue(UUID mapId);

    long countByMapMapIdAndWinsGreaterThan(UUID mapId, Integer wins);

    long countByMapMapIdAndLossesGreaterThan(UUID mapId, Integer losses);
}
