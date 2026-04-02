package com.smu.csd.learner;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearnerXpRepository extends JpaRepository<LearnerXp, UUID> {

    @Query("""
            SELECT COALESCE(SUM(x.xpDelta), 0)
            FROM LearnerXp x
            WHERE x.learner.learnerId = :learnerId
              AND COALESCE(x.occurredAt, x.createdAt) >= :since
            """)
    Long sumXpDeltaSince(@Param("learnerId") UUID learnerId, @Param("since") OffsetDateTime since);

    @Query(value = """
            SELECT (DATE_TRUNC('day', COALESCE(x.occured_at, x.created_at)))::date AS day,
                   COALESCE(SUM(x.xp_delta), 0)::int AS total
            FROM roles.learner_xp x
            WHERE x.learner_id = :learnerId
              AND COALESCE(x.occured_at, x.created_at) >= :since
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> sumXpDeltaByDaySince(@Param("learnerId") UUID learnerId, @Param("since") Instant since);
}
