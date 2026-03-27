package com.smu.csd.learner;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.leaderboard.LeaderboardService;

public class LearnerServiceUnitTest {

    private LearnerService service;
    private LearnerRepository repository;
    private LeaderboardService leaderboardService;

    @BeforeEach
    public void setUp() {
        repository = mock(LearnerRepository.class);
        leaderboardService = mock(LeaderboardService.class);
        service = new LearnerService(repository, leaderboardService);
    }

    @Test
    public void testCreateLearnerSuccess() throws ResourceAlreadyExistsException {
        UUID userId = UUID.randomUUID();
        Learner learner = Learner.builder()
                .supabaseUserId(userId)
                .username("testuser")
                .email("test@example.com")
                .full_name("Test User")
                .level(1)
                .total_xp(0)
                .gold(0)
                .build();
        learner.setLearnerId(UUID.randomUUID());

        when(repository.existsByEmail("test@example.com")).thenReturn(false);
        when(repository.existsBySupabaseUserId(userId)).thenReturn(false);
        when(repository.save(any(Learner.class))).thenReturn(learner);
        doNothing().when(leaderboardService).upsertLearnerScore(learner);

        Learner result = service.createLearner(userId, "testuser", "test@example.com", "Test User");

        assertNotNull(result);
        assertEquals(userId, result.getSupabaseUserId());
        assertEquals(1, result.getLevel());
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    @Test
    public void testCreateLearnerDuplicateEmail() {
        UUID userId = UUID.randomUUID();
        when(repository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class, () ->
            service.createLearner(userId, "testuser", "test@example.com", "Test User")
        );
    }

    @Test
    public void testCreateLearnerProfileAlreadyExists() {
        UUID userId = UUID.randomUUID();
        when(repository.existsByEmail("test@example.com")).thenReturn(false);
        when(repository.existsBySupabaseUserId(userId)).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class, () ->
            service.createLearner(userId, "testuser", "test@example.com", "Test User")
        );
    }

    @Test
    public void testGetByIdSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(id);

        when(repository.findById(id)).thenReturn(java.util.Optional.of(learner));

        Learner result = service.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getLearnerId());
    }

    @Test
    public void testGetByIdNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getById(id));
    }

    @Test
    public void testAwardXpAndGoldSuccess() throws ResourceNotFoundException {
        UUID userId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(userId);
        learner.setTotal_xp(100);
        learner.setGold(50);
        learner.setLevel(1);

        when(repository.findBySupabaseUserId(userId)).thenReturn(learner);
        when(repository.save(learner)).thenReturn(learner);
        doNothing().when(leaderboardService).upsertLearnerScore(learner);

        Learner result = service.awardXpAndGoldBySupabaseUserId(userId, 50, 25);

        assertEquals(150, result.getTotal_xp());
        assertEquals(75, result.getGold());
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    @Test
    public void testAwardXpAndGoldLearnerNotFound() {
        UUID userId = UUID.randomUUID();
        when(repository.findBySupabaseUserId(userId)).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () ->
            service.awardXpAndGoldBySupabaseUserId(userId, 50, 25)
        );
    }

    @Test
    public void testAwardXpAndGoldLevelUp() throws ResourceNotFoundException {
        UUID userId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(userId);
        learner.setTotal_xp(0);
        learner.setGold(0);
        learner.setLevel(1);

        when(repository.findBySupabaseUserId(userId)).thenReturn(learner);
        when(repository.save(learner)).thenReturn(learner);
        doNothing().when(leaderboardService).upsertLearnerScore(learner);

        // Award 300 XP - should level up to level 2 (sqrt(300/100) + 1 = 2)
        Learner result = service.awardXpAndGoldBySupabaseUserId(userId, 300, 0);

        assertEquals(300, result.getTotal_xp());
        assertEquals(2, result.getLevel());
    }

    @Test
    public void testExistsBySupabaseUserId() {
        UUID userId = UUID.randomUUID();
        when(repository.existsBySupabaseUserId(userId)).thenReturn(true);

        boolean result = service.existsBySupabaseUserId(userId);

        assertTrue(result);
    }

    @Test
    public void testUpdateLearnerSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(id);
        learner.setUsername("olduser");

        when(repository.findById(id)).thenReturn(java.util.Optional.of(learner));
        when(repository.save(learner)).thenReturn(learner);
        doNothing().when(leaderboardService).upsertLearnerScore(learner);

        service.updateLearner(id, "newuser", null, null, null, null, null);

        assertEquals("newuser", learner.getUsername());
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    @Test
    public void testDeleteLearnerSuccess() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);
        doNothing().when(repository).deleteById(id);
        doNothing().when(leaderboardService).removeLearner(id);

        service.deleteLearner(id);

        verify(repository).deleteById(id);
        verify(leaderboardService).removeLearner(id);
    }

    @Test
    public void testDeleteLearnerNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.deleteLearner(id));
    }
}
