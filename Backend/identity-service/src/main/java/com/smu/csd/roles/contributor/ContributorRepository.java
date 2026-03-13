package com.smu.csd.roles.contributor;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContributorRepository extends JpaRepository<Contributor, UUID> {

    Optional<Contributor> findBySupabaseUserId(UUID supabaseUserId);

    boolean existsBySupabaseUserId(UUID supabaseUserId);

    // Check if email already taken (used during registration to prevent duplicates)
    boolean existsByEmail(String email);
}
