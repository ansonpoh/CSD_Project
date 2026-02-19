package com.smu.csd.roles.administrator;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.learner.Learner;

@Service
public class AdministratorService {
    private final AdministratorRepository repository;

    private static final String ID_PREFIX = "ADM";

    // Spring sees AdministratorService needs AdministratorRepository so it will create repo and pass to this constructor
    public AdministratorService(AdministratorRepository repository) {
        this.repository = repository;
    }

    // // Generate next ID: ADM001, ADM002, ADM003, etc.
    // private String generateNextId() {
    //     return repository.findTopByOrderByAidDesc()
    //             .map(admin -> {
    //                 // Extract numeric part from "ADM001" -> 1
    //                 String currentId = admin.getAid();
    //                 int number = Integer.parseInt(currentId.substring(ID_PREFIX.length()));
    //                 // Increment and format back to "ADM002"
    //                 return String.format("%s%03d", ID_PREFIX, number + 1);
    //             })
    //             .orElse(ID_PREFIX + "001"); // First admin gets ADM001
    // }

    // // @Transactional ensures if something fails, the database rolls back so no partial data is saved
    // @Transactional
    // public Administrator createAdministrator(UUID supabaseUserId, String email, String fullName) throws ResourceAlreadyExistsException {
    //     // Check if email already exists (prevent duplicates)
    //     if (repository.existsByEmail(email)) {
    //         throw new ResourceAlreadyExistsException("Administrator", "email", email);
    //     }

    //     // Check if this Supabase user already has an admin profile
    //     if (repository.existsBySupabaseUserId(supabaseUserId)) {
    //         throw new ResourceAlreadyExistsException("Administrator profile already exists for this user");
    //     }

    //     // Generate the next ID automatically
    //     String newId = generateNextId();

    //     // Build the Administrator object using Lombok's @Builder
    //     // Dont need to create constructors, getters and setters in Administrator
    //     Administrator admin = Administrator.builder()
    //             .aid(newId)
    //             .supabaseUserId(supabaseUserId)
    //             .email(email)
    //             .fullName(fullName)
    //             .build();

    //     // Save to database and return the saved entity
    //     return repository.save(admin);
    // }
    public Administrator saveAdministrator(Administrator administrator) {
        return repository.save(administrator);
    }
    
    public List<Administrator> getAllAdministrators() {
        return repository.findAll();
    }

    public Administrator getById(UUID id) throws ResourceNotFoundException {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Administrator", "id", id));
    }

    // Used after login to fetch the admin's profile.
    public Administrator getBySupabaseUserId(UUID supabaseUserId) throws ResourceNotFoundException {
        return repository.findBySupabaseUserId(supabaseUserId);
    }

    public boolean isAdministrator(UUID supabaseUserId) {
        return repository.existsBySupabaseUserId(supabaseUserId);
    }

    @Transactional
    public Administrator updateAdministrator(UUID id, String fullName, Boolean isActive) throws ResourceNotFoundException {
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
    public void deleteAdministrator(UUID id) throws ResourceNotFoundException {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Administrator", "id", id);
        }
        repository.deleteById(id);
    }

    // Deactivate instead of deleting. Keeps the record but marks as inactive.
    @Transactional
    public Administrator deactivateAdministrator(UUID id) throws ResourceNotFoundException {
        Administrator admin = getById(id);
        admin.setIsActive(false);
        return repository.save(admin);
    }
}
