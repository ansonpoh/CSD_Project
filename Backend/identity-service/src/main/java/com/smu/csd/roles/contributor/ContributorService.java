package com.smu.csd.roles.contributor;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

@Service
public class ContributorService {
    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 500;

    private final ContributorRepository repository;

    public ContributorService(ContributorRepository repository) {
        this.repository = repository;
    }

    // Bio must not exceed 100 words
    private void validateBioWordCount(String bio) {
        if (bio != null && !bio.isBlank()) {
            int wordCount = bio.trim().split("\\s+").length;
            if (wordCount > 100) {
                throw new IllegalArgumentException(
                    "Bio must not exceed 100 words (currently " + wordCount + " words)"
                );
            }
        }
    }

    @Transactional
    public Contributor createContributor(UUID supabaseUserId, String email, String fullName, String bio)
            throws ResourceAlreadyExistsException {
        if (repository.existsByEmail(email)) {
            throw new ResourceAlreadyExistsException("Contributor", "email", email);
        }
        if (repository.existsBySupabaseUserId(supabaseUserId)) {
            throw new ResourceAlreadyExistsException("Contributor profile already exists for this user");
        }

        validateBioWordCount(bio);

        Contributor contributor = Contributor.builder()
                .supabaseUserId(supabaseUserId)
                .email(email)
                .fullName(fullName)
                .bio(bio)
                .build();

        return repository.save(contributor);
    }

    public List<Contributor> getAllContributors() {
        return getAllContributors(0, DEFAULT_PAGE_SIZE);
    }

    public List<Contributor> getAllContributors(int page, int size) {
        return repository.findAll(
                PageRequest.of(
                        normalizePage(page),
                        normalizeSize(size),
                        Sort.by(Sort.Direction.DESC, "createdAt")
                )
        ).getContent();
    }

    public Contributor getById(UUID id) throws ResourceNotFoundException {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contributor", "id", id));
    }

    public Contributor getBySupabaseUserId(UUID supabaseUserId) throws ResourceNotFoundException {
        return repository.findBySupabaseUserId(supabaseUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Contributor", "supabaseUserId", supabaseUserId));
    }

    public boolean isContributor(UUID supabaseUserId) {
        return repository.existsBySupabaseUserId(supabaseUserId);
    }

    @Transactional
    public Contributor updateContributor(UUID id, String fullName, String bio, Boolean isActive)
            throws ResourceNotFoundException {
        Contributor contributor = getById(id);

        if (fullName != null) {
            contributor.setFullName(fullName);
        }
        if (bio != null) {
            validateBioWordCount(bio);
            contributor.setBio(bio);
        }
        if (isActive != null) {
            contributor.setIsActive(isActive);
        }

        return repository.save(contributor);
    }

    @Transactional
    public void deleteContributor(UUID id) throws ResourceNotFoundException {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Contributor", "id", id);
        }
        repository.deleteById(id);
    }

    @Transactional
    public Contributor deactivateContributor(UUID id) throws ResourceNotFoundException {
        Contributor contributor = getById(id);
        contributor.setIsActive(false);
        return repository.save(contributor);
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
