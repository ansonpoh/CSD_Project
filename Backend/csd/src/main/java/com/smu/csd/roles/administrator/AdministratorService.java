package com.smu.csd.roles.administrator;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdministratorService {
    private final AdministratorRepository repository;

    // Spring sees AdministratorService needs AdministratorRepository so it will create repo and pass to this constructor
    public AdministratorService(AdministratorRepository repository) {
        this.repository = repository;
    }

    // @Transactional ensures if something fails, the database rolls back so no partial data is saved
    @Transactional
    public Administrator createAdministrator(String id, UUID supabaseUserId, String email, String fullName) {
        // Check if id already exists
        if (repository.existsById(id)) {
            throw new RuntimeException("Administrator already exists with id: " + id);
        }

        // Check if email already exists (prevent duplicates)
        if (repository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists: " + email);
        }

        // Check if this Supabase user already has an admin profile
        if (repository.existsBySupabaseUserId(supabaseUserId)) {
            throw new RuntimeException("Administrator profile already exists for this user");
        }

        // Build the Administrator object using Lombok's @Builder
        // Dont need to create constructors, getters and setters in Administrator
        Administrator admin = Administrator.builder()
                .aid(id)
                .supabaseUserId(supabaseUserId)
                .email(email)
                .fullName(fullName)
                .build();

        // Save to database and return the saved entity
        return repository.save(admin);
    }

    public List<Administrator> getAllAdministrators() {
        return repository.findAll();
    }

    public Administrator getById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Administrator not found with id: " + id));
    }

    // Used after login to fetch the admin's profile.
    public Administrator getBySupabaseUserId(UUID supabaseUserId) {
        return repository.findBySupabaseUserId(supabaseUserId)
                .orElseThrow(() -> new RuntimeException("Administrator not found with supabaseUserId: " + supabaseUserId));
    }

    public boolean isAdministrator(UUID supabaseUserId) {
        return repository.existsBySupabaseUserId(supabaseUserId);
    }

    @Transactional
    public Administrator updateAdministrator(String id, String fullName, Boolean isActive) {
        // First, fetch the existing administrator
        Administrator admin = getById(id);

        // Update only if new values are provided
        if (fullName != null) {
            admin.setFullName(fullName);
        }
        if (isActive != null) {
            admin.setIsActive(isActive);
        }

        // Save updates - @PreUpdate in Entity will set updatedAt automatically
        return repository.save(admin);
    }

    // also deletes from auth.users due to ON DELETE CASCADE in SQL
    @Transactional
    public void deleteAdministrator(String id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Administrator not found with id: " + id);
        }
        repository.deleteById(id);
    }

    // Deactivate instead of deleting. Keeps the record but marks as inactive.
    @Transactional
    public Administrator deactivateAdministrator(String id) {
        Administrator admin = getById(id);
        admin.setIsActive(false);
        return repository.save(admin);
    }
}
