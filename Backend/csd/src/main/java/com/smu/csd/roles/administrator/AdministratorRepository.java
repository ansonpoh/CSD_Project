package com.smu.csd.roles.administrator;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdministratorRepository extends JpaRepository<Administrator, UUID> {

    // JpaRepository only provides methods for the PRIMARY KEY
    // But we may need to query by OTHER columns (supabaseUserId, email),
    // so we declare these methods. Spring auto-generates the SQL.

    Administrator findBySupabaseUserId(UUID supabaseUserId);

    boolean existsBySupabaseUserId(UUID supabaseUserId);

    // Check if email already taken (used during registration to prevent duplicates)
    boolean existsByEmail(String email);
}
