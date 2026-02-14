package com.smu.csd.roles.learner;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerRepository extends JpaRepository<Learner, UUID> {
    Optional<Learner> findBySupabaseUserId(UUID supabaseUserId);
}
