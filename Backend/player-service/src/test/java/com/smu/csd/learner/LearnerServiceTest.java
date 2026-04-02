package com.smu.csd.learner;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.leaderboard.LeaderboardService;

@ExtendWith(MockitoExtension.class)
class LearnerServiceTest {

    @Mock
    private LearnerRepository repository;

    @Mock
    private LeaderboardService leaderboardService;

    @InjectMocks
    private LearnerService service;

    private UUID supabaseUserId;
    private UUID learnerId;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        learnerId = UUID.randomUUID();
    }

    @Test
    void createLearner_throwsWhenEmailAlreadyExists() {
        when(repository.existsByEmail("alice@example.com")).thenReturn(true);

        ResourceAlreadyExistsException ex = assertThrows(ResourceAlreadyExistsException.class,
                () -> service.createLearner(supabaseUserId, "alice", "alice@example.com", "Alice"));

        assertEquals("Email is already in use.", ex.getMessage());
        verify(repository, never()).save(any(Learner.class));
        verify(leaderboardService, never()).upsertLearnerScore(any(Learner.class));
    }

    @Test
    void createLearner_persistsDefaultsAndUpsertsLeaderboard() throws ResourceAlreadyExistsException {
        when(repository.existsByEmail("alice@example.com")).thenReturn(false);
        when(repository.existsByUsernameIgnoreCase("alice")).thenReturn(false);
        when(repository.existsBySupabaseUserId(supabaseUserId)).thenReturn(false);
        when(repository.save(any(Learner.class))).thenAnswer(invocation -> {
            Learner learner = invocation.getArgument(0);
            learner.setLearnerId(learnerId);
            return learner;
        });

        Learner created = service.createLearner(supabaseUserId, "alice", "alice@example.com", "Alice");

        assertEquals(learnerId, created.getLearnerId());
        assertEquals(1, created.getLevel());
        assertEquals(0, created.getTotal_xp());
        assertEquals(0, created.getGold());

        ArgumentCaptor<Learner> learnerCaptor = ArgumentCaptor.forClass(Learner.class);
        verify(leaderboardService).upsertLearnerScore(learnerCaptor.capture());
        assertEquals(learnerId, learnerCaptor.getValue().getLearnerId());
    }

    @Test
    void createLearner_throwsWhenUsernameAlreadyExists() {
        when(repository.existsByEmail("alice@example.com")).thenReturn(false);
        when(repository.existsByUsernameIgnoreCase("alice")).thenReturn(true);

        ResourceAlreadyExistsException ex = assertThrows(ResourceAlreadyExistsException.class,
                () -> service.createLearner(supabaseUserId, "alice", "alice@example.com", "Alice"));

        assertEquals("Username is already in use.", ex.getMessage());
        verify(repository, never()).save(any(Learner.class));
        verify(leaderboardService, never()).upsertLearnerScore(any(Learner.class));
    }

    @Test
    void createLearner_throwsWhenSupabaseUserAlreadyHasLearnerProfile() {
        when(repository.existsByEmail("alice@example.com")).thenReturn(false);
        when(repository.existsByUsernameIgnoreCase("alice")).thenReturn(false);
        when(repository.existsBySupabaseUserId(supabaseUserId)).thenReturn(true);

        ResourceAlreadyExistsException ex = assertThrows(ResourceAlreadyExistsException.class,
                () -> service.createLearner(supabaseUserId, "alice", "alice@example.com", "Alice"));

        assertEquals("Learner profile already exists for this user", ex.getMessage());
        verify(repository, never()).save(any(Learner.class));
        verify(leaderboardService, never()).upsertLearnerScore(any(Learner.class));
    }

    @Test
    void awardXpAndGoldBySupabaseUserId_appliesAwardsAndRecomputesLevel() throws ResourceNotFoundException {
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .total_xp(300)
                .level(1)
                .gold(10)
                .is_active(true)
                .build();

        when(repository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.save(any(Learner.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Learner updated = service.awardXpAndGoldBySupabaseUserId(supabaseUserId, 100, null);

        assertEquals(400, updated.getTotal_xp());
        assertEquals(10, updated.getGold());
        assertEquals(3, updated.getLevel());
        verify(leaderboardService).upsertLearnerScore(updated);
    }

    @Test
    void awardXpAndGoldBySupabaseUserId_treatsNullAwardsAndExistingValuesAsZero() throws ResourceNotFoundException {
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .total_xp(null)
                .level(1)
                .gold(null)
                .is_active(true)
                .build();

        when(repository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.save(any(Learner.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Learner updated = service.awardXpAndGoldBySupabaseUserId(supabaseUserId, null, null);

        assertEquals(0, updated.getTotal_xp());
        assertEquals(0, updated.getGold());
        assertEquals(1, updated.getLevel());
        verify(leaderboardService).upsertLearnerScore(updated);
    }

    @Test
    void getBySupabaseUserId_returnsLearnerWhenFound() throws ResourceNotFoundException {
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .build();
        when(repository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);

        Learner result = service.getBySupabaseUserId(supabaseUserId);

        assertEquals(learner, result);
    }

    @Test
    void getBySupabaseUserId_throwsWhenLearnerMissing() {
        when(repository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.getBySupabaseUserId(supabaseUserId));

        assertEquals("Learner not found with supabaseUserId: " + supabaseUserId, ex.getMessage());
    }

    @Test
    void awardXpAndGoldBySupabaseUserId_throwsWhenLearnerMissing() {
        when(repository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.awardXpAndGoldBySupabaseUserId(supabaseUserId, 10, 5));

        assertEquals("Learner not found with supabaseUserId: " + supabaseUserId, ex.getMessage());
        verify(repository, never()).save(any(Learner.class));
        verify(leaderboardService, never()).upsertLearnerScore(any(Learner.class));
    }

    @Test
    void updateLearner_updatesOnlyProvidedFields() throws ResourceNotFoundException {
        Learner existing = Learner.builder()
                .learnerId(learnerId)
                .username("alice")
                .full_name("Alice Old")
                .total_xp(10)
                .level(1)
                .gold(5)
                .is_active(true)
                .build();

        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(Learner.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Learner updated = service.updateLearner(learnerId, null, "Alice New", null, null, 99, false);

        assertEquals("alice", updated.getUsername());
        assertEquals("Alice New", updated.getFull_name());
        assertEquals(10, updated.getTotal_xp());
        assertEquals(99, updated.getGold());
        assertEquals(false, updated.getIs_active());
        verify(leaderboardService).upsertLearnerScore(updated);
    }

    @Test
    void updateLearner_throwsWhenLearnerMissing() {
        when(repository.findById(learnerId)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.updateLearner(learnerId, "alice2", "Alice", 10, 1, 2, true));

        assertEquals("Learner not found with id: " + learnerId, ex.getMessage());
        verify(repository, never()).save(any(Learner.class));
        verify(leaderboardService, never()).upsertLearnerScore(any(Learner.class));
    }

    @Test
    void deleteLearner_deletesAndRemovesFromLeaderboard() throws ResourceNotFoundException {
        when(repository.existsById(learnerId)).thenReturn(true);

        service.deleteLearner(learnerId);

        verify(repository).deleteById(learnerId);
        verify(leaderboardService).removeLearner(learnerId);
    }

    @Test
    void deleteLearner_throwsWhenLearnerMissing() {
        when(repository.existsById(learnerId)).thenReturn(false);

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.deleteLearner(learnerId));

        assertEquals("Learner not found with id: " + learnerId, ex.getMessage());
        verify(repository, never()).deleteById(any(UUID.class));
        verify(leaderboardService, never()).removeLearner(any(UUID.class));
    }
}
