package com.smu.csd.learner_profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.achievements.AchievementService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

public class LearnerProfileStateServiceUnitTest {

    private LearnerProfileStateRepository repository;
    private LearnerRepository learnerRepository;
    private AchievementService achievementService;
    private LearnerProfileStateService service;

    @BeforeEach
    void setUp() {
        repository = mock(LearnerProfileStateRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        achievementService = mock(AchievementService.class);
        service = new LearnerProfileStateService(repository, learnerRepository, achievementService);
    }

    @Test
    void getProfileState_CreatesDefaultStateForNewLearner() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), supabaseUserId);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.empty());
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse result = service.getProfileState(supabaseUserId);

        assertEquals("azure-knight", result.avatarPreset());
        assertEquals(LocalDate.now().toString(), result.dailyQuests().dateKey());
        assertEquals(0, result.dailyQuests().streak());
        assertEquals(3, result.dailyQuests().quests().size());
        verify(repository).save(any(LearnerProfileState.class));
    }

    @Test
    void recordDailyQuestEvent_LessonCompletedIncrementsQuestAndLearningStreak() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), supabaseUserId);
        LearnerProfileState state = LearnerProfileState.builder()
                .learnerId(learner.getLearnerId())
                .learner(learner)
                .avatarPreset("  ")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(new LinkedHashMap<>())
                .dailyQuestStreak(0)
                .learningStreak(2)
                .learningStreakLastCompletedDate(LocalDate.now().minusDays(1))
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.of(state));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse result = service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", 1);

        assertEquals(1, result.dailyQuests().quests().stream()
                .filter(q -> q.id().equals("complete-lesson"))
                .findFirst()
                .orElseThrow()
                .progress());
        assertEquals(3, result.dailyQuests().learningStreak());
        verify(achievementService).recordEvent(eq(learner.getLearnerId()), eq("lesson_completed"), eq(1), anyString(), isNull(), isNull());
    }

    @Test
    void getProfileState_ResetsDailyStateOnDateRollover() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), supabaseUserId);
        LearnerProfileState state = LearnerProfileState.builder()
                .learnerId(learner.getLearnerId())
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now().minusDays(1))
                .dailyQuestProgress(new LinkedHashMap<>(Map.of("complete-lesson", 1)))
                .dailyQuestStreak(2)
                .learningStreak(4)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.of(state));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse result = service.getProfileState(supabaseUserId);

        assertEquals(LocalDate.now().toString(), result.dailyQuests().dateKey());
        assertTrue(result.dailyQuests().quests().stream().allMatch(q -> q.progress() == 0 || !q.id().equals("complete-lesson")));
        assertFalse(result.dailyQuests().completedToday());
    }

    @Test
    void dailyStreakIncrementsOnlyWhenAllQuestsCompleteAndNotAlreadyCompletedToday() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), supabaseUserId);
        Map<String, Integer> progress = new LinkedHashMap<>();
        progress.put("complete-lesson", 1);
        progress.put("defeat-monster", 1);
        progress.put("claim-reward", 1);
        LearnerProfileState state = LearnerProfileState.builder()
                .learnerId(learner.getLearnerId())
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(progress)
                .dailyQuestStreak(2)
                .dailyQuestLastCompletedDate(LocalDate.now().minusDays(1))
                .learningStreak(1)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.of(state));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse result = service.getProfileState(supabaseUserId);

        assertTrue(result.dailyQuests().completedToday());
        assertEquals(3, result.dailyQuests().streak());

        LearnerProfileState alreadyCompleted = LearnerProfileState.builder()
                .learnerId(learner.getLearnerId())
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(progress)
                .dailyQuestStreak(3)
                .dailyQuestLastCompletedDate(LocalDate.now())
                .learningStreak(1)
                .build();
        when(repository.findById(learner.getLearnerId())).thenReturn(java.util.Optional.of(alreadyCompleted));

        LearnerProfileStateResponse second = service.getProfileState(supabaseUserId);
        assertEquals(3, second.dailyQuests().streak());
    }

    @Test
    void getProfileState_RejectsUnknownLearner() {
        UUID supabaseUserId = UUID.randomUUID();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.getProfileState(supabaseUserId)
        );

        assertEquals("Learner profile not found for current user.", exception.getMessage());
    }

    private Learner learner(UUID learnerId, UUID supabaseUserId) {
        return Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("learner")
                .email("learner@example.com")
                .full_name("Learner")
                .is_active(true)
                .build();
    }
}
