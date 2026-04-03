package com.smu.csd.achievements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

public class AchievementServiceUnitTest {

    private AchievementRepository achievementRepository;
    private LearnerAchievementRepository learnerAchievementRepository;
    private AchievementEventRepository achievementEventRepository;
    private LearnerRepository learnerRepository;
    private LeaderboardService leaderboardService;
    private AchievementService service;

    @BeforeEach
    void setUp() {
        achievementRepository = mock(AchievementRepository.class);
        learnerAchievementRepository = mock(LearnerAchievementRepository.class);
        achievementEventRepository = mock(AchievementEventRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        leaderboardService = mock(LeaderboardService.class);
        service = new AchievementService(
                achievementRepository,
                learnerAchievementRepository,
                achievementEventRepository,
                learnerRepository,
                leaderboardService
        );
    }

    @Test
    void recordEvent_NoOpsForNullLearnerIdOrBlankEventType() {
        service.recordEvent(null, "lesson_completed", 1, "player-service", null, Map.of());
        service.recordEvent(UUID.randomUUID(), "   ", 1, "player-service", null, Map.of());

        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
    }

    @Test
    void recordEvent_NoOpsOnDuplicateIdempotencyKey() {
        UUID learnerId = UUID.randomUUID();
        when(achievementEventRepository.existsByIdempotencyKey("dup-key")).thenReturn(true);

        service.recordEvent(learnerId, "lesson_completed", 1, "player-service", "dup-key", Map.of());

        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
        verify(learnerRepository, never()).findById(any());
    }

    @Test
    void recordEvent_NoOpsWhenLearnerNotFound() {
        UUID learnerId = UUID.randomUUID();
        when(achievementEventRepository.existsByIdempotencyKey("fresh-key")).thenReturn(false);
        when(learnerRepository.findById(learnerId)).thenReturn(Optional.empty());

        service.recordEvent(learnerId, "lesson_completed", 1, null, "fresh-key", Map.of());

        verify(achievementEventRepository, never()).save(any(AchievementEvent.class));
        verify(learnerAchievementRepository, never()).save(any(LearnerAchievement.class));
    }

    @Test
    void recordEvent_CreatesProgressRowForMatchingAchievement() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, "user", 0, 1, 0);
        Achievement achievement = achievement(UUID.randomUUID(), "lesson_completed", "COUNTER", 3);

        when(achievementEventRepository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("lesson_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learnerId, achievement.getAchievementId()))
                .thenReturn(List.of());
        when(learnerAchievementRepository.save(any(LearnerAchievement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.recordEvent(learnerId, "lesson_completed", 1, "player-service", "key-1", Map.of("lessonId", "abc"));

        verify(achievementEventRepository).save(any(AchievementEvent.class));
        verify(learnerAchievementRepository).save(any(LearnerAchievement.class));
    }

    @Test
    void recordEvent_HandlesBooleanProgressTypeCorrectly() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, "user", 0, 1, 0);
        Achievement achievement = achievement(UUID.randomUUID(), "npc_completed", "BOOLEAN", 1);
        LearnerAchievement existing = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(0)
                .isUnlocked(false)
                .isRewardClaimed(false)
                .build();

        when(achievementEventRepository.existsByIdempotencyKey("key-2")).thenReturn(false);
        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("npc_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learnerId, achievement.getAchievementId()))
                .thenReturn(List.of(existing));
        when(learnerAchievementRepository.save(any(LearnerAchievement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.recordEvent(learnerId, "npc_completed", 0, "player-service", "key-2", Map.of());

        verify(learnerAchievementRepository).save(any(LearnerAchievement.class));
        LearnerAchievement saved = learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learnerId, achievement.getAchievementId()).get(0);
        assertEquals(1, saved.getProgressValue());
    }

    @Test
    void recordEvent_UnlocksAchievementWhenTargetReached() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = learner(learnerId, "user", 10, 1, 0);
        Achievement achievement = achievement(UUID.randomUUID(), "quiz_completed", "COUNTER", 5);
        LearnerAchievement existing = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(4)
                .isUnlocked(false)
                .isRewardClaimed(true)
                .build();

        when(achievementEventRepository.existsByIdempotencyKey("key-3")).thenReturn(false);
        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(achievementRepository.findByEventTypeAndIsActiveTrue("quiz_completed")).thenReturn(List.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learnerId, achievement.getAchievementId()))
                .thenReturn(List.of(existing));
        when(learnerAchievementRepository.save(any(LearnerAchievement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.recordEvent(learnerId, "quiz_completed", 1, "player-service", "key-3", Map.of());

        verify(learnerAchievementRepository).save(any(LearnerAchievement.class));
        LearnerAchievement saved = learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learnerId, achievement.getAchievementId()).get(0);
        assertTrue(saved.getProgressValue() >= 5);
    }

    @Test
    void claimAchievementForSupabaseUser_RejectsInvalidAndNotUnlockedCases() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID achievementId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> service.claimAchievementForSupabaseUser(null, achievementId));
        assertThrows(IllegalArgumentException.class, () -> service.claimAchievementForSupabaseUser(supabaseUserId, null));

        Learner learner = learner(UUID.randomUUID(), "user", 0, 1, 0);
        Achievement achievement = achievement(achievementId, "quiz_completed", "COUNTER", 5);
        LearnerAchievement locked = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(4)
                .isUnlocked(false)
                .isRewardClaimed(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learner.getLearnerId(), achievementId))
                .thenReturn(List.of(locked));

        assertThrows(IllegalStateException.class, () -> service.claimAchievementForSupabaseUser(supabaseUserId, achievementId));
    }

    @Test
    void claimAchievementForSupabaseUser_AppliesRewardsAndUpdatesLeaderboardOnce() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID achievementId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), "user", 100, 2, 50);
        Achievement achievement = achievement(achievementId, "quiz_completed", "COUNTER", 1);
        LearnerAchievement unlocked = LearnerAchievement.builder()
                .learner(learner)
                .achievement(achievement)
                .progressValue(1)
                .isUnlocked(true)
                .isRewardClaimed(false)
                .unlockedAt(LocalDateTime.now())
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(achievementRepository.findByAchievementIdAndIsActiveTrue(achievementId)).thenReturn(Optional.of(achievement));
        when(learnerAchievementRepository.findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learner.getLearnerId(), achievementId))
                .thenReturn(List.of(unlocked));
        when(learnerAchievementRepository.save(any(LearnerAchievement.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(learnerRepository.save(any(Learner.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AchievementProgressResponse response = service.claimAchievementForSupabaseUser(supabaseUserId, achievementId);

        assertEquals(achievementId, response.achievementId());
        assertTrue(response.isUnlocked());
        assertTrue(response.isRewardClaimed());
        assertEquals(110, learner.getTotal_xp());
        assertEquals(60, learner.getGold());
        assertEquals(2, learner.getLevel());
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    private Learner learner(UUID learnerId, String username, int totalXp, int level, int gold) {
        return Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(UUID.randomUUID())
                .username(username)
                .email(username + "@example.com")
                .full_name(username)
                .total_xp(totalXp)
                .level(level)
                .gold(gold)
                .is_active(true)
                .build();
    }

    private Achievement achievement(UUID achievementId, String eventType, String progressType, int targetValue) {
        return Achievement.builder()
                .achievementId(achievementId)
                .name("Achievement")
                .description("Desc")
                .category("Category")
                .eventType(eventType)
                .progressType(progressType)
                .targetValue(targetValue)
                .rewardXp(10)
                .rewardGold(10)
                .isHidden(false)
                .isActive(true)
                .build();
    }
}
