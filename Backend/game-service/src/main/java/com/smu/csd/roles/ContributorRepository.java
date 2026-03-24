package com.smu.csd.roles;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContributorRepository extends JpaRepository<Contributor, UUID> {
    Optional<Contributor> findBySupabaseUserId(UUID supabaseUserId);
}
