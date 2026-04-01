package com.smu.csd.learner;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearnerRepository extends JpaRepository<Learner, UUID> {
    Learner findBySupabaseUserId(UUID supabaseUserId);

    boolean existsBySupabaseUserId(UUID supabaseUserId);

    @Query("""
        select (count(l) > 0)
        from Learner l
        where l.supabaseUserId = :supabaseUserId
          and l.is_active = true
    """)
    boolean existsBySupabaseUserIdAndIs_activeTrue(@Param("supabaseUserId") UUID supabaseUserId);

    boolean existsByEmail(String email);

    @Query("""
        select l
        from Learner l
        where l.is_active = true
    """)
    org.springframework.data.domain.Page<Learner> findByIs_activeTrue(org.springframework.data.domain.Pageable pageable);

    @Query("""
        select l
        from Learner l
        where l.is_active = true
    """)
    java.util.List<Learner> findByIs_activeTrue(org.springframework.data.domain.Sort sort);

    @Query("""
        select l
        from Learner l
        where l.is_active = true
          and l.learnerId <> :excludeLearnerId
          and lower(l.username) like lower(concat(:query, '%'))
        order by l.username asc
    """)
    java.util.List<Learner> searchActiveByUsernamePrefix(
            @Param("query") String query,
            @Param("excludeLearnerId") UUID excludeLearnerId,
            Pageable pageable
    );
}
