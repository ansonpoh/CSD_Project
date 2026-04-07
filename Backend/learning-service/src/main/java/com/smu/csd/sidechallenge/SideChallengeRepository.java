package com.smu.csd.sidechallenge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SideChallengeRepository extends JpaRepository<SideChallenge, UUID> {
    List<SideChallenge> findByMapThemeIgnoreCaseAndIsActiveTrue(String mapTheme);
    List<SideChallenge> findByIsActiveTrue();

    @Query(
            value = """
                SELECT *
                FROM side_challenge.side_challenge
                WHERE is_active = true
                ORDER BY RANDOM()
                LIMIT 1
            """,
            nativeQuery = true
    )
    Optional<SideChallenge> findRandomActive();
}
