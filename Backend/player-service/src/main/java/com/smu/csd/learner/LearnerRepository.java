package com.smu.csd.learner;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerRepository extends JpaRepository<Learner, UUID> {
    Learner findBySupabaseUserId(UUID supabaseUserId);

    boolean existsBySupabaseUserId(UUID supabaseUserId);

    boolean existsByEmail(String email);
}
