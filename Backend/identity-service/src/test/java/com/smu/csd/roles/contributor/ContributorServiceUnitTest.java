package com.smu.csd.roles.contributor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

public class ContributorServiceUnitTest {

    private ContributorService service;
    private ContributorRepository repository;

    @BeforeEach
    public void setUp() {
        repository = mock(ContributorRepository.class);
        service = new ContributorService(repository);
    }

    @Test
    public void testCreateContributorSuccess() throws ResourceAlreadyExistsException {
        UUID userId = UUID.randomUUID();
        Contributor contributor = Contributor.builder()
                .supabaseUserId(userId)
                .email("test@example.com")
                .fullName("Test User")
                .bio("Short bio")
                .build();
        contributor.setContributorId(UUID.randomUUID());

        when(repository.existsByEmail("test@example.com")).thenReturn(false);
        when(repository.save(any(Contributor.class))).thenReturn(contributor);

        Contributor result = service.createContributor(userId, "test@example.com", "Test User", "Short bio");

        assertNotNull(result);
        assertEquals(userId, result.getSupabaseUserId());
        verify(repository).save(any(Contributor.class));
    }

    @Test
    public void testCreateContributorDuplicateEmail() {
        UUID userId = UUID.randomUUID();

        when(repository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class, () ->
            service.createContributor(userId, "test@example.com", "Test User", "Short bio")
        );
    }

    @Test
    public void testCreateContributorBioExceedsWordLimit() {
        UUID userId = UUID.randomUUID();
        String longBio = "word ".repeat(101).trim();

        when(repository.existsByEmail("test@example.com")).thenReturn(false);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            service.createContributor(userId, "test@example.com", "Test User", longBio)
        );
        assertTrue(exception.getMessage().contains("Bio must not exceed 100 words"));
    }

    @Test
    public void testGetByIdSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Contributor contributor = new Contributor();
        contributor.setContributorId(id);

        when(repository.findById(id)).thenReturn(java.util.Optional.of(contributor));

        Contributor result = service.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getContributorId());
    }

    @Test
    public void testGetByIdNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getById(id));
    }

    @Test
    public void testUpdateContributorSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Contributor contributor = new Contributor();
        contributor.setContributorId(id);
        contributor.setFullName("Old Name");
        contributor.setBio("Old bio");

        when(repository.findById(id)).thenReturn(java.util.Optional.of(contributor));
        when(repository.save(contributor)).thenReturn(contributor);

        Contributor result = service.updateContributor(id, "New Name", "New bio", null);

        assertEquals("New Name", result.getFullName());
        assertEquals("New bio", result.getBio());
        verify(repository).save(contributor);
    }

    @Test
    public void testUpdateContributorPartialUpdate() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Contributor contributor = new Contributor();
        contributor.setContributorId(id);
        contributor.setFullName("Old Name");

        when(repository.findById(id)).thenReturn(java.util.Optional.of(contributor));
        when(repository.save(contributor)).thenReturn(contributor);

        service.updateContributor(id, null, "New bio", null);

        assertEquals("Old Name", contributor.getFullName());
        assertEquals("New bio", contributor.getBio());
    }

    @Test
    public void testDeactivateContributor() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Contributor contributor = new Contributor();
        contributor.setContributorId(id);
        contributor.setIsActive(true);

        when(repository.findById(id)).thenReturn(java.util.Optional.of(contributor));
        when(repository.save(contributor)).thenReturn(contributor);

        Contributor result = service.deactivateContributor(id);

        assertFalse(result.getIsActive());
        verify(repository).save(contributor);
    }

    @Test
    public void testDeleteContributorSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);

        service.deleteContributor(id);

        verify(repository).deleteById(id);
    }

    @Test
    public void testDeleteContributorNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.deleteContributor(id));
    }

    @Test
    public void testIsContributor() {
        UUID userId = UUID.randomUUID();
        when(repository.existsBySupabaseUserId(userId)).thenReturn(true);

        boolean result = service.isContributor(userId);

        assertTrue(result);
    }
}
