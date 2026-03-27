package com.smu.csd.roles.administrator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.exception.ResourceNotFoundException;

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
}
