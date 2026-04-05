package com.smu.csd.sidechallenge;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SideChallengeProgressRepository extends JpaRepository<SideChallenge, UUID> {

    interface ProgressRow {
        Integer getAttempts();
        Boolean getCompleted();
        String getLastResult();
    }

    @Query(value = """
        SELECT attempts AS attempts,
               completed AS completed,
               last_result AS lastResult
        FROM side_challenge.learner_side_challenge_progress
        WHERE learner_id = :learnerId
          AND side_challenge_id = :sideChallengeId
        LIMIT 1
        """, nativeQuery = true)
    Optional<ProgressRow> findProgress(
            @Param("learnerId") UUID learnerId,
            @Param("sideChallengeId") UUID sideChallengeId);

    @Modifying
    @Query(value = """
        UPDATE side_challenge.learner_side_challenge_progress
        SET attempts = COALESCE(attempts, 0) + 1,
            completed = COALESCE(completed, FALSE) OR CAST(:won AS boolean),
            last_result = CASE WHEN :won THEN 'won' ELSE 'lost' END,
            first_completed_at = CASE
                WHEN :won AND first_completed_at IS NULL THEN NOW()
                ELSE first_completed_at
            END,
            last_completed_at = CASE
                WHEN :won THEN NOW()
                ELSE last_completed_at
            END,
            updated_at = NOW()
        WHERE learner_id = :learnerId
          AND side_challenge_id = :sideChallengeId
        """, nativeQuery = true)
    int updateAttempt(
            @Param("learnerId") UUID learnerId,
            @Param("sideChallengeId") UUID sideChallengeId,
            @Param("won") boolean won);

    @Modifying
    @Query(value = """
        INSERT INTO side_challenge.learner_side_challenge_progress
            (learner_id, side_challenge_id, attempts, completed, last_result, first_completed_at, last_completed_at, created_at, updated_at)
        VALUES
            (
                :learnerId,
                :sideChallengeId,
                1,
                CAST(:won AS boolean),
                CASE WHEN :won THEN 'won' ELSE 'lost' END,
                CASE WHEN :won THEN NOW() ELSE NULL END,
                CASE WHEN :won THEN NOW() ELSE NULL END,
                NOW(),
                NOW()
            )
        """, nativeQuery = true)
    void insertAttempt(
            @Param("learnerId") UUID learnerId,
            @Param("sideChallengeId") UUID sideChallengeId,
            @Param("won") boolean won);
}
