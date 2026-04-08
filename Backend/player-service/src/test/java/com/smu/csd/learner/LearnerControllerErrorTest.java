package com.smu.csd.learner;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

public class LearnerControllerErrorTest {

    private LearnerController controller;
    private LearnerService service;

    @BeforeEach
    public void setUp() {
        service = mock(LearnerService.class);
        controller = new LearnerController(service);
    }

    @Test
    public void testGetLearnerById_NotFound() throws Exception {
        UUID id = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        when(service.getBySupabaseUserId(supabaseUserId))
                .thenReturn(Learner.builder().learnerId(id).supabaseUserId(supabaseUserId).is_active(true).build());
        when(service.getById(id)).thenThrow(new ResourceNotFoundException("Learner", "id", id));

        Exception exception = assertThrows(ResourceNotFoundException.class, () -> controller.getLearnerById(id, authentication));
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    public void testCreateLearner_DuplicateEmail() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        Learner learner = new Learner();
        learner.setEmail("test@example.com");
        when(service.createLearner(any(), any(), any(), any()))
                .thenThrow(new ResourceAlreadyExistsException("Learner", "email", "test@example.com"));

        Exception exception = assertThrows(ResourceAlreadyExistsException.class, () ->
            controller.addLearner(learner, authentication)
        );
        assertTrue(exception.getMessage().contains("email"));
    }

    @Test
    public void testCreateLearner_ProfileAlreadyExists() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        Learner learner = new Learner();
        learner.setEmail("test@example.com");
        when(service.createLearner(any(), any(), any(), any()))
                .thenThrow(new ResourceAlreadyExistsException("Learner profile already exists for this user"));

        Exception exception = assertThrows(ResourceAlreadyExistsException.class, () ->
            controller.addLearner(learner, authentication)
        );
        assertTrue(exception.getMessage().contains("already exists"));
    }

    @Test
    public void testUpdateLearner_NotFound() throws Exception {
        UUID id = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        Learner learner = new Learner();
        when(service.getBySupabaseUserId(supabaseUserId))
                .thenReturn(Learner.builder().learnerId(id).supabaseUserId(supabaseUserId).is_active(true).build());
        when(service.updateLearner(eq(id), any(), any(), any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Learner", "id", id));

        Exception exception = assertThrows(ResourceNotFoundException.class, () ->
            controller.updateLearner(id, learner, authentication)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    public void testDeleteLearner_NotFound() throws Exception {
        UUID id = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        when(service.getBySupabaseUserId(supabaseUserId))
                .thenReturn(Learner.builder().learnerId(id).supabaseUserId(supabaseUserId).is_active(true).build());
        doThrow(new ResourceNotFoundException("Learner", "id", id)).when(service).deleteLearner(id);

        Exception exception = assertThrows(ResourceNotFoundException.class, () ->
            controller.deleteLearner(id, authentication)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    // Note: awardXp requires Authentication which needs Spring context to test properly
    // This is tested via integration tests instead

    private Authentication mockAuthentication(UUID supabaseUserId) {
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(authentication.getAuthorities()).thenReturn(java.util.List.of());
        return authentication;
    }
}
