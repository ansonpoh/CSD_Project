package com.smu.csd.learner;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner_profile.LearnerProfileState;
import com.smu.csd.learner_profile.LearnerProfileStateRepository;
import com.smu.csd.learner_progress.LearnerLessonProgressRepository;

public class LearnerServiceUnitTest {

    private LearnerService service;
    private LearnerRepository repository;
    private LeaderboardService leaderboardService;
    private LearnerProfileStateRepository profileStateRepository;
    private LearnerLessonProgressRepository lessonProgressRepository;
    private RestTemplate restTemplate;
    private LearnerXpRepository learnerXpRepository;

    @BeforeEach
    public void setUp() {
        repository = mock(LearnerRepository.class);
        leaderboardService = mock(LeaderboardService.class);
        profileStateRepository = mock(LearnerProfileStateRepository.class);
        lessonProgressRepository = mock(LearnerLessonProgressRepository.class);
        restTemplate = mock(RestTemplate.class);
        learnerXpRepository = mock(LearnerXpRepository.class);
        service = new LearnerService(repository, leaderboardService);
        ReflectionTestUtils.setField(service, "profileStateRepository", profileStateRepository);
        ReflectionTestUtils.setField(service, "lessonProgressRepository", lessonProgressRepository);
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "learnerXpRepository", learnerXpRepository);
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
    public void testCreateLearnerDuplicateEmailRelinksSupabaseUser() throws ResourceAlreadyExistsException {
        UUID oldSupabaseUserId = UUID.randomUUID();
        UUID newSupabaseUserId = UUID.randomUUID();
        Learner existingLearner = Learner.builder()
                .learnerId(UUID.randomUUID())
                .supabaseUserId(oldSupabaseUserId)
                .username("existinguser")
                .email("test@example.com")
                .full_name("Existing User")
                .level(2)
                .total_xp(150)
                .gold(30)
                .is_active(true)
                .build();

        when(repository.findBySupabaseUserId(newSupabaseUserId)).thenReturn(null);
        when(repository.findByEmailIgnoreCase("test@example.com")).thenReturn(existingLearner);
        when(repository.save(existingLearner)).thenReturn(existingLearner);

        Learner result = service.createLearner(newSupabaseUserId, "testuser", "test@example.com", "Test User");

        assertNotNull(result);
        assertEquals(newSupabaseUserId, result.getSupabaseUserId());
        verify(repository).save(existingLearner);
        verify(leaderboardService).upsertLearnerScore(existingLearner);
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
    public void testCreateLearnerRejectsDuplicateUsernameCaseInsensitively() {
        UUID userId = UUID.randomUUID();
        when(repository.existsByEmail("test@example.com")).thenReturn(false);
        when(repository.existsByUsernameIgnoreCase("testuser")).thenReturn(true);

        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () ->
            service.createLearner(userId, "testuser", "test@example.com", "Test User")
        );

        assertEquals("Username is already in use.", exception.getMessage());
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
    public void testGetBySupabaseUserIdNotFound() {
        UUID userId = UUID.randomUUID();
        when(repository.findBySupabaseUserId(userId)).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () -> service.getBySupabaseUserId(userId));
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
        when(repository.existsBySupabaseUserIdAndIs_activeTrue(userId)).thenReturn(true);

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

    @Test
    public void testAwardXpAndGold_ExactLevelBoundary() throws ResourceNotFoundException {
        UUID userId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(userId);
        learner.setTotal_xp(300);
        learner.setGold(0);
        learner.setLevel(2);

        when(repository.findBySupabaseUserId(userId)).thenReturn(learner);
        when(repository.save(learner)).thenReturn(learner);

        Learner result = service.awardXpAndGoldBySupabaseUserId(userId, 100, 0);

        assertEquals(400, result.getTotal_xp());
        assertEquals(3, result.getLevel());
    }

    @Test
    public void testAwardXpAndGold_NegativeValuesClampToZero() throws ResourceNotFoundException {
        UUID userId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(userId);
        learner.setTotal_xp(50);
        learner.setGold(5);
        learner.setLevel(1);

        when(repository.findBySupabaseUserId(userId)).thenReturn(learner);
        when(repository.save(learner)).thenReturn(learner);

        Learner result = service.awardXpAndGoldBySupabaseUserId(userId, -999, -999);

        assertEquals(0, result.getTotal_xp());
        assertEquals(0, result.getGold());
        assertEquals(1, result.getLevel());
    }

    @Test
    public void testAwardXpAndGold_OverflowClampedAtIntegerMax() throws ResourceNotFoundException {
        UUID userId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(userId);
        learner.setTotal_xp(Integer.MAX_VALUE - 10);
        learner.setGold(Integer.MAX_VALUE - 1);
        learner.setLevel(1000);

        when(repository.findBySupabaseUserId(userId)).thenReturn(learner);
        when(repository.save(learner)).thenReturn(learner);

        Learner result = service.awardXpAndGoldBySupabaseUserId(userId, 1_000_000, 1_000_000);

        assertEquals(Integer.MAX_VALUE, result.getTotal_xp());
        assertEquals(Integer.MAX_VALUE, result.getGold());
    }

    @Test
    public void testAwardXpAndGoldBySupabaseUserIdSkipsLearnerXpSaveWhenXpDeltaIsZero() throws ResourceNotFoundException {
        UUID userId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(userId);
        learner.setTotal_xp(100);
        learner.setGold(10);
        learner.setLevel(2);

        when(repository.findBySupabaseUserId(userId)).thenReturn(learner);
        when(repository.save(learner)).thenReturn(learner);

        service.awardXpAndGoldBySupabaseUserId(userId, 0, 15);

        verify(learnerXpRepository, never()).save(any(LearnerXp.class));
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    @Test
    public void testUpdateLearnerAppliesProvidedFieldsIncludingIsActiveAndStillSyncsLeaderboard() throws ResourceNotFoundException {
        UUID id = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(id);
        learner.setUsername("old");
        learner.setIs_active(true);

        when(repository.findById(id)).thenReturn(java.util.Optional.of(learner));
        when(repository.save(learner)).thenReturn(learner);

        Learner updated = service.updateLearner(id, "new", "Full Name", 250, 3, 80, false);

        assertEquals("new", updated.getUsername());
        assertEquals("Full Name", updated.getFull_name());
        assertEquals(250, updated.getTotal_xp());
        assertEquals(3, updated.getLevel());
        assertEquals(80, updated.getGold());
        assertFalse(updated.getIs_active());
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    @Test
    public void testGetLearnerAnalyticsComputesCurrentExpAndExpToNextLevelCorrectlyFromTotalXpAndLevel() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 3, 450);
        stubAnalyticsDefaults(learner);

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(3, result.getCurrentLevel());
        assertEquals(50, result.getCurrentExp());
        assertEquals(500, result.getExpToNextLevel());
    }

    @Test
    public void testGetLearnerAnalyticsUsesProfileStreakDataWhenProfileStateExists() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 1, 0);
        stubAnalyticsDefaults(learner);
        when(profileStateRepository.findById(learnerId)).thenReturn(java.util.Optional.of(
                LearnerProfileState.builder().learnerId(learnerId).learningStreak(6).build()
        ));

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(6, result.getCurrentStreak());
        assertEquals(6, result.getLongestStreak());
    }

    @Test
    public void testGetLearnerAnalyticsMapsTopicProgressCountsByCompletedInProgressAndNotStarted() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 1, 0);
        stubAnalyticsDefaults(learner);
        when(lessonProgressRepository.countTopicProgressByStatus(learnerId)).thenReturn(List.of(
                new Object[] { "COMPLETED", 4L },
                new Object[] { "IN_PROGRESS", 2L },
                new Object[] { "NOT_STARTED", 7L }
        ));

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(4, result.getTopicsCompleted());
        assertEquals(2, result.getTopicsInProgress());
        assertEquals(7, result.getTopicsNotStarted());
    }

    @Test
    public void testGetLearnerAnalyticsBuildsA7DayExpHistoryFromSparseLearnerXpRows() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 2, 180);
        stubAnalyticsDefaults(learner);
        LocalDate today = LocalDate.now();
        when(learnerXpRepository.sumXpDeltaSince(eq(learnerId), any())).thenReturn(50L);
        when(learnerXpRepository.sumXpDeltaByDaySince(eq(learnerId), any())).thenReturn(List.of(
                new Object[] { Date.valueOf(today.minusDays(1)), 30 },
                new Object[] { Date.valueOf(today.minusDays(4)), 20 }
        ));

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(50, result.getExpGainedLast7Days());
        assertEquals(7, result.getExpHistory().size());
        assertEquals(50, result.getExpHistory().stream().mapToInt(LearnerAnalyticsResponse.ExpHistoryEntry::getExpGained).sum());
    }

    @Test
    public void testGetLearnerAnalyticsFallsBackToZeroExpHistoryWhenLearnerXpRepositoryThrows() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 2, 180);
        stubAnalyticsDefaults(learner);
        when(learnerXpRepository.sumXpDeltaSince(eq(learnerId), any())).thenThrow(new RuntimeException("xp down"));

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(0, result.getExpGainedLast7Days());
        assertTrue(result.getExpHistory().isEmpty());
    }

    @Test
    public void testGetLearnerAnalyticsAppliesRemoteQuizAnalyticsFromLearningServiceWhenAvailable() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 1, 0);
        stubAnalyticsDefaults(learner);
        when(restTemplate.getForObject(anyString(), eq(LearnerAnalyticsResponse.class)))
                .thenReturn(new LearnerAnalyticsResponse(0, 0, 0, 0, 0, 0, 0, 0, 8, 91.5, 3, 0, List.of()));

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(8, result.getQuizzesAttempted());
        assertEquals(91.5, result.getAverageQuizScore());
        assertEquals(3, result.getBossCompletions());
    }

    @Test
    public void testGetLearnerAnalyticsIgnoresLearningServiceLookupFailuresAndStillReturnsLocalAnalytics() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, 2, 180);
        stubAnalyticsDefaults(learner);
        when(restTemplate.getForObject(anyString(), eq(LearnerAnalyticsResponse.class))).thenThrow(new RuntimeException("remote down"));

        LearnerAnalyticsResponse result = service.getLearnerAnalytics(learnerId);

        assertEquals(2, result.getCurrentLevel());
        assertEquals(80, result.getCurrentExp());
        assertEquals(300, result.getExpToNextLevel());
        assertEquals(0, result.getQuizzesAttempted());
        assertEquals(0.0, result.getAverageQuizScore());
    }

    private Learner learner(UUID learnerId, Integer level, Integer totalXp) {
        Learner learner = new Learner();
        learner.setLearnerId(learnerId);
        learner.setSupabaseUserId(UUID.randomUUID());
        learner.setLevel(level);
        learner.setTotal_xp(totalXp);
        learner.setGold(0);
        learner.setIs_active(true);
        return learner;
    }

    private void stubAnalyticsDefaults(Learner learner) {
        when(repository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.of(learner));
        when(profileStateRepository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.empty());
        when(lessonProgressRepository.countTopicProgressByStatus(learner.getLearnerId())).thenReturn(List.of());
        when(learnerXpRepository.sumXpDeltaSince(eq(learner.getLearnerId()), any())).thenReturn(0L);
        when(learnerXpRepository.sumXpDeltaByDaySince(eq(learner.getLearnerId()), any())).thenReturn(List.of());
        when(restTemplate.getForObject(anyString(), eq(LearnerAnalyticsResponse.class))).thenReturn(null);
    }
}
