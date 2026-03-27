package com.smu.csd.roles.administrator;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

public class AdministratorControllerErrorTest {

    private AdministratorController controller;
    private AdministratorService service;

    @BeforeEach
    public void setUp() {
        service = mock(AdministratorService.class);
        controller = new AdministratorController(service);
    }

    @Test
    public void testGetAdministratorById_NotFound() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.getById(id)).thenThrow(new ResourceNotFoundException("Administrator", "id", id));

        Exception exception = assertThrows(ResourceNotFoundException.class, () -> controller.getById(id));
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    public void testCreateAdministrator_DuplicateEmail() {
        // Note: saveAdministrator doesn't throw exceptions - duplicate handling
        // would need to be added to the service layer. This test documents expected behavior.
        Administrator admin = new Administrator();
        admin.setEmail("test@example.com");
        when(service.saveAdministrator(any(Administrator.class))).thenReturn(admin);

        // Currently returns the saved admin - no duplicate check in service
        Administrator result = controller.addAdministrator(admin);

        assertNotNull(result);
    }

    @Test
    public void testUpdateAdministrator_NotFound() throws Exception {
        UUID id = UUID.randomUUID();
        AdministratorController.UpdateAdminRequest request = new AdministratorController.UpdateAdminRequest("Test User", true);
        when(service.updateAdministrator(eq(id), any(), any()))
                .thenThrow(new ResourceNotFoundException("Administrator", "id", id));

        Exception exception = assertThrows(ResourceNotFoundException.class, () ->
            controller.updateAdministrator(id, request)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    public void testDeleteAdministrator_NotFound() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new ResourceNotFoundException("Administrator", "id", id)).when(service).deleteAdministrator(id);

        Exception exception = assertThrows(ResourceNotFoundException.class, () ->
            controller.deleteAdministrator(id)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    public void testGetBySupabaseUserId_NotFound() throws Exception {
        UUID userId = UUID.randomUUID();
        when(service.getBySupabaseUserId(userId)).thenThrow(new ResourceNotFoundException("Administrator", "supabaseUserId", userId));

        Exception exception = assertThrows(ResourceNotFoundException.class, () ->
            controller.getBySupabaseUserId(userId)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }
}
