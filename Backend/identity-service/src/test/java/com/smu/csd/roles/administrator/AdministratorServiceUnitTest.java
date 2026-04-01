package com.smu.csd.roles.administrator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.exception.ResourceAlreadyExistsException;

public class AdministratorServiceUnitTest {

    private AdministratorService service;
    private AdministratorRepository repository;

    @BeforeEach
    public void setUp() {
        repository = mock(AdministratorRepository.class);
        service = new AdministratorService(repository);
    }

    @Test
    public void testGetByIdSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Administrator admin = new Administrator();
        admin.setAdministratorId(id);
        
        when(repository.findById(id)).thenReturn(Optional.of(admin));

        Administrator result = service.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getAdministratorId());
    }

    @Test
    public void testIsAdministrator() {
        UUID userId = UUID.randomUUID();
        when(repository.existsBySupabaseUserId(userId)).thenReturn(true);

        boolean result = service.isAdministrator(userId);

        assertEquals(true, result);
    }

    @Test
    public void testSaveAdministrator_DuplicateSupabaseUserId() {
        UUID supabaseUserId = UUID.randomUUID();
        Administrator admin = Administrator.builder()
                .supabaseUserId(supabaseUserId)
                .email("admin1@example.com")
                .build();

        when(repository.existsByEmail("admin1@example.com")).thenReturn(false);
        when(repository.existsBySupabaseUserId(supabaseUserId)).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class, () -> service.saveAdministrator(admin));
    }

    @Test
    public void testSaveAdministrator_DuplicateEmail() {
        Administrator admin = Administrator.builder()
                .supabaseUserId(UUID.randomUUID())
                .email("admin2@example.com")
                .build();

        when(repository.existsByEmail("admin2@example.com")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class, () -> service.saveAdministrator(admin));
    }

    @Test
    public void testSaveAdministrator_Success() throws ResourceAlreadyExistsException {
        UUID supabaseUserId = UUID.randomUUID();
        Administrator admin = Administrator.builder()
                .administratorId(UUID.randomUUID())
                .supabaseUserId(supabaseUserId)
                .email("admin3@example.com")
                .build();

        when(repository.existsByEmail("admin3@example.com")).thenReturn(false);
        when(repository.existsBySupabaseUserId(supabaseUserId)).thenReturn(false);
        when(repository.save(admin)).thenReturn(admin);

        Administrator saved = service.saveAdministrator(admin);

        assertNotNull(saved);
        assertEquals("admin3@example.com", saved.getEmail());
        verify(repository).save(admin);
    }
}
