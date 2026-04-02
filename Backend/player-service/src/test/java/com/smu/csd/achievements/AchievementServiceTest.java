package com.smu.csd.achievements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock
    private AchievementRepository achievementRepository;
    @Mock
    private LearnerAchievementRepository learnerAchievementRepository;
    @Mock
    private AchievementEventRepository achievementEventRepository;
    @Mock
    private LearnerRepository learnerRepository;
    @Mock
    private LeaderboardService leaderboardService;

    @InjectMocks
    private AchievementService achievementService;

    private UUID learnerId;
    private UUID supabaseUserId;
    private Learner learner;

    @BeforeEach
    void setUp() {
        learnerId = UUID.randomUUID();
        supabaseUserId = UUID.randomUUID();
        learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("tester")
                .email("tester@example.com")
                .total_xp(100)
                .gold(10)
                .level(2)
                .is_active(true)
                .build();
    }

    @Test
    void recordEvent_skipsWhenIdempotencyKeyAlreadyExists() {
        when(achievementEventRepository.existsByIdempotencyKey("dup-key")).thenReturn(true);

        achievementService.recordEvent(learnerId, "lesson_completed", 1, "player-service", "dup-key", Map.of());

        verify(learnerRepository, never()).findById(any());
        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
    }

    @Test
    void getMyAchievements_throwsWhenLearnerNotFound() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> achievementService.getMyAchievements(supabaseUserId));

        assertEquals("Learner profile not found for current user.", ex.getMessage());
        verify(achievementRepository, never()).findByIsActiveTrueOrderByCreatedAtAsc();
    }

    @Test
    void getMyAchievements_returnsActiveAchievementsWithDefaultProgress() {
        UUID firstAchievementId = UUID.randomUUID();
        UUID secondAchievementId = UUID.randomUUID();
        Achievement first = achievement(firstAchievementId, "lesson_completed", "COUNTER", 3, 10, 2);
        Achievement second = achievement(secondAchievementId, "monster_defeated", "BOOLEAN", 1, 20, 4);

        LearnerAchievement progress = LearnerAchievement.builder()
                .learner(learner)
                .achievement(first)
                .progressValue(2)
                .isUnlocked(false)
                .isRewardClaimed(false)
                .build();

        LearnerAchievement invalidProgress = LearnerAchievement.builder()
                .learner(learner)
                .achievement(null)
                .progressValue(999)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByIsActiveTrueOrderByCreatedAtAsc()).thenReturn(List.of(first, second));
        when(learnerAchievementRepository.findByLearnerLearnerId(learnerId)).thenReturn(List.of(progress, invalidProgress));

        List<AchievementProgressResponse> response = achievementService.getMyAchievements(supabaseUserId);

        assertEquals(2, response.size());
        assertEquals(firstAchievementId, response.get(0).achievementId());
        assertEquals(2, response.get(0).progressValue());
        assertFalse(response.get(0).isUnlocked());
        assertEquals(secondAchievementId, response.get(1).achievementId());
        assertEquals(0, response.get(1).progressValue());
        assertFalse(response.get(1).isUnlocked());
    }

    @Test
    void recordEvent_returnsEarlyWhenEventTypeBlank() {
        achievementService.recordEvent(learnerId, "   ", 1, "player-service", null, null);

        verify(achievementEventRepository, never()).existsByIdempotencyKey(any());
        verify(learnerRepository, never()).findById(any());
        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
    }

    @Test
    void recordEvent_normalizesEventAndDefaultsSourceAndValue() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 5, 0, 0);

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("lesson_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of());
        when(achievementEventRepository.save(any(AchievementEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        achievementService.recordEvent(learnerId, "  lesson_completed  ", 0, "   ", "  idem-key  ", null);

        ArgumentCaptor<AchievementEvent> eventCaptor = ArgumentCaptor.forClass(AchievementEvent.class);
        verify(achievementEventRepository).save(eventCaptor.capture());
        assertEquals("lesson_completed", eventCaptor.getValue().getEventType());
        assertEquals(1, eventCaptor.getValue().getEventValue());
        assertEquals("player-service", eventCaptor.getValue().getSourceService());
        assertEquals("idem-key", eventCaptor.getValue().getIdempotencyKey());
    }

    @Test
    void recordEvent_unlocksCounterAchievementAtTargetBoundary() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 3, 50, 25);

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("lesson_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of());
        when(achievementEventRepository.save(any(AchievementEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(learnerAchievementRepository.save(any(LearnerAchievement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        achievementService.recordEvent(learnerId, "lesson_completed", 3, "player-service", "unlock-key", Map.of("x", 1));

        ArgumentCaptor<LearnerAchievement> progressCaptor = ArgumentCaptor.forClass(LearnerAchievement.class);
        verify(learnerAchievementRepository).save(progressCaptor.capture());
        assertEquals(3, progressCaptor.getValue().getProgressValue());
        assertTrue(Boolean.TRUE.equals(progressCaptor.getValue().getIsUnlocked()));

        ArgumentCaptor<AchievementEvent> eventCaptor = ArgumentCaptor.forClass(AchievementEvent.class);
        verify(achievementEventRepository).save(eventCaptor.capture());
        assertEquals("unlock-key", eventCaptor.getValue().getIdempotencyKey());
        assertEquals(3, eventCaptor.getValue().getEventValue());
    }

    @Test
    void recordEvent_forBooleanProgressSetsProgressToTarget() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "monster_defeated", "BOOLEAN", 5, 10, 5);
        LearnerAchievement existing = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(1)
                .isUnlocked(false)
                .isRewardClaimed(false)
                .build();

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("monster_defeated")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(existing));
        when(achievementEventRepository.save(any(AchievementEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        achievementService.recordEvent(learnerId, "monster_defeated", 1, "player-service", null, null);

        ArgumentCaptor<LearnerAchievement> progressCaptor = ArgumentCaptor.forClass(LearnerAchievement.class);
        verify(learnerAchievementRepository).save(progressCaptor.capture());
        assertEquals(5, progressCaptor.getValue().getProgressValue());
        assertTrue(Boolean.TRUE.equals(progressCaptor.getValue().getIsUnlocked()));
    }

    @Test
    void recordEvent_saturatesCounterProgressAtIntegerMax() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", Integer.MAX_VALUE, 0, 0);
        LearnerAchievement existing = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(Integer.MAX_VALUE - 1)
                .isUnlocked(false)
                .isRewardClaimed(false)
                .build();

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("lesson_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(existing));

        achievementService.recordEvent(learnerId, "lesson_completed", 10, "player-service", null, null);

        ArgumentCaptor<LearnerAchievement> progressCaptor = ArgumentCaptor.forClass(LearnerAchievement.class);
        verify(learnerAchievementRepository).save(progressCaptor.capture());
        assertEquals(Integer.MAX_VALUE, progressCaptor.getValue().getProgressValue());
    }

    @Test
    void recordEvent_resetsRewardClaimWhenStateIsLockedButClaimed() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 10, 0, 0);
        LearnerAchievement existing = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(1)
                .isUnlocked(false)
                .isRewardClaimed(true)
                .rewardClaimedAt(java.time.LocalDateTime.now().minusDays(1))
                .build();

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("lesson_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(existing));

        achievementService.recordEvent(learnerId, "lesson_completed", 1, "player-service", null, null);

        ArgumentCaptor<LearnerAchievement> progressCaptor = ArgumentCaptor.forClass(LearnerAchievement.class);
        verify(learnerAchievementRepository).save(progressCaptor.capture());
        assertFalse(Boolean.TRUE.equals(progressCaptor.getValue().getIsRewardClaimed()));
        assertNull(progressCaptor.getValue().getRewardClaimedAt());
    }

    @Test
    void recordEventForSupabaseUser_noOpWhenLearnerMissing() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        achievementService.recordEventForSupabaseUser(supabaseUserId, "lesson_completed", 1, "player-service", null, null);

        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
        verify(learnerAchievementRepository, never()).save(any(LearnerAchievement.class));
    }

    @Test
    void recordEventForSupabaseUser_noOpWhenSupabaseUserIdIsNull() {
        achievementService.recordEventForSupabaseUser(null, "lesson_completed", 1, "player-service", null, null);

        verify(learnerRepository, never()).findBySupabaseUserId(any());
        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
    }

    @Test
    void claimAchievementForSupabaseUser_appliesRewardsAndUpdatesLeaderboard() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 5, 400, 30);
        LearnerAchievement progress = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(5)
                .isUnlocked(true)
                .isRewardClaimed(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(progress));
        when(learnerAchievementRepository.save(any(LearnerAchievement.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(learnerRepository.save(any(Learner.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AchievementProgressResponse response = achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId);

        assertTrue(response.isRewardClaimed());
        assertEquals(500, learner.getTotal_xp());
        assertEquals(40, learner.getGold());
        assertEquals(3, learner.getLevel());
        verify(leaderboardService).upsertLearnerScore(eq(learner));
    }

    @Test
    void claimAchievementForSupabaseUser_returnsCurrentStateWhenAlreadyClaimed() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 2, 10, 10);
        LearnerAchievement progress = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(2)
                .isUnlocked(true)
                .isRewardClaimed(true)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(progress));

        AchievementProgressResponse response = achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId);

        assertTrue(response.isRewardClaimed());
        verify(learnerRepository, never()).save(any(Learner.class));
        verify(leaderboardService, never()).upsertLearnerScore(any(Learner.class));
    }

    @Test
    void claimAchievementForSupabaseUser_throwsOnInvalidInput() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> achievementService.claimAchievementForSupabaseUser(null, UUID.randomUUID()));

        assertEquals("Achievement claim request is invalid.", ex.getMessage());
    }

    @Test
    void claimAchievementForSupabaseUser_throwsWhenLearnerMissing() {
        UUID achievementId = UUID.randomUUID();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId));

        assertEquals("Learner profile not found for current user.", ex.getMessage());
    }

    @Test
    void claimAchievementForSupabaseUser_throwsWhenAchievementInactiveOrMissing() {
        UUID achievementId = UUID.randomUUID();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId));

        assertEquals("Achievement not found or inactive.", ex.getMessage());
    }

    @Test
    void claimAchievementForSupabaseUser_throwsWhenNoProgressRowExists() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 2, 10, 10);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId));

        assertEquals("Achievement is not unlocked yet.", ex.getMessage());
    }

    @Test
    void claimAchievementForSupabaseUser_throwsWhenNotUnlocked() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 2, 10, 10);
        LearnerAchievement progress = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(1)
                .isUnlocked(false)
                .isRewardClaimed(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(progress));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId));

        assertEquals("Achievement is not unlocked yet.", ex.getMessage());
        assertFalse(Boolean.TRUE.equals(progress.getIsRewardClaimed()));
    }

    @Test
    void claimAchievementForSupabaseUser_treatsNegativeRewardsAsZero() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = achievement(achievementId, "lesson_completed", "COUNTER", 1, -25, -5);
        LearnerAchievement progress = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(1)
                .isUnlocked(true)
                .isRewardClaimed(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(
                learnerId, achievementId)).thenReturn(List.of(progress));

        AchievementProgressResponse response = achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId);

        assertEquals(100, learner.getTotal_xp());
        assertEquals(10, learner.getGold());
        assertEquals(2, learner.getLevel());
        assertTrue(response.isRewardClaimed());
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    private static Achievement achievement(
            UUID id,
            String eventType,
            String progressType,
            int target,
            int rewardXp,
            int rewardGold
    ) {
        return Achievement.builder()
                .achievementId(id)
                .name("Achievement")
                .description("desc")
                .category("test")
                .eventType(eventType)
                .progressType(progressType)
                .targetValue(target)
                .rewardXp(rewardXp)
                .rewardGold(rewardGold)
                .isHidden(false)
                .isActive(true)
                .build();
    }
}
