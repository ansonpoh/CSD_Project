package com.smu.csd.roles.administrator;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdministratorRepository extends JpaRepository<Administrator, String> {

    /*
     * Why do we need these custom methods?
     *
     * JpaRepository only provides methods for the PRIMARY KEY (id):
     *   - findById(Long id)
     *   - existsById(Long id)
     *   - deleteById(Long id)
     *
     * But we need to query by OTHER columns (supabaseUserId, email),
     * so we declare these methods. Spring auto-generates the SQL.
     */

    // Find admin by their Supabase auth ID (used after login to get admin profile)
    // SQL: SELECT * FROM administrator WHERE supabase_user_id = ?
    Optional<Administrator> findBySupabaseUserId(UUID supabaseUserId);

    // Check if admin exists by Supabase ID (used to verify if user is an admin)
    // SQL: SELECT COUNT(*) > 0 FROM administrator WHERE supabase_user_id = ?
    boolean existsBySupabaseUserId(UUID supabaseUserId);

    // Check if email already taken (used during registration to prevent duplicates)
    // SQL: SELECT COUNT(*) > 0 FROM administrator WHERE email = ?
    boolean existsByEmail(String email);
}
