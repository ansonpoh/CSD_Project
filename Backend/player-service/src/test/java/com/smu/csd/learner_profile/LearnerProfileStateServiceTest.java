package com.smu.csd.learner_profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.LinkedHashMap;
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

import com.smu.csd.achievements.AchievementService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class LearnerProfileStateServiceTest {

    @Mock
    private LearnerProfileStateRepository repository;
    @Mock
    private LearnerRepository learnerRepository;
    @Mock
    private AchievementService achievementService;

    @InjectMocks
    private LearnerProfileStateService service;

    private UUID supabaseUserId;
    private UUID learnerId;
    private Learner learner;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        learnerId = UUID.randomUUID();
        learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("test")
                .email("test@example.com")
                .is_active(true)
                .build();
    }

    @Test
    void getProfileState_createsDefaultStateWhenMissing() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.empty());
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.getProfileState(supabaseUserId);

        assertEquals("azure-knight", response.avatarPreset());
        assertEquals(0, response.dailyQuests().streak());
        assertEquals(0, response.dailyQuests().learningStreak());
        assertEquals(3, response.dailyQuests().quests().size());
        assertEquals(0, response.dailyQuests().quests().stream().mapToInt(LearnerProfileStateResponse.DailyQuestProgress::progress).sum());
    }

    @Test
    void updateAvatarPreset_usesDefaultWhenBlankInput() {
        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("warrior")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(new LinkedHashMap<>())
                .dailyQuestStreak(0)
                .learningStreak(0)
                .build();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.updateAvatarPreset(supabaseUserId, "   ");

        assertEquals("azure-knight", response.avatarPreset());
    }

    @Test
    void recordDailyQuestEvent_ignoresNegativeAmountForQuestProgress() {
        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(new LinkedHashMap<>(Map.of("complete-lesson", 1)))
                .dailyQuestStreak(0)
                .learningStreak(0)
                .build();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", -5);

        int completeLessonProgress = response.dailyQuests().quests().stream()
                .filter(q -> q.id().equals("complete-lesson"))
                .findFirst()
                .orElseThrow()
                .progress();
        assertEquals(1, completeLessonProgress);
        verify(achievementService).recordEvent(eq(learnerId), eq("lesson_completed"), eq(-5), eq("player-service"), eq(null), eq(null));
    }

    @Test
    void recordDailyQuestEvent_incrementsLearningStreakWhenLastCompletionWasYesterday() {
        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(new LinkedHashMap<>())
                .dailyQuestStreak(1)
                .learningStreak(2)
                .learningStreakLastCompletedDate(LocalDate.now().minusDays(1))
                .build();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", 1);

        assertEquals(3, response.dailyQuests().learningStreak());
    }

    @Test
    void recordDailyQuestEvent_completesAllDailyQuestsAndAdvancesStreak() {
        Map<String, Integer> progress = new LinkedHashMap<>();
        progress.put("complete-lesson", 0);
        progress.put("defeat-monster", 1);
        progress.put("claim-reward", 1);

        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(progress)
                .dailyQuestStreak(3)
                .dailyQuestLastCompletedDate(LocalDate.now().minusDays(1))
                .learningStreak(1)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", 1);

        assertEquals(true, response.dailyQuests().completedToday());
        assertEquals(4, response.dailyQuests().streak());

        ArgumentCaptor<LearnerProfileState> stateCaptor = ArgumentCaptor.forClass(LearnerProfileState.class);
        verify(repository).save(stateCaptor.capture());
        assertEquals(LocalDate.now(), stateCaptor.getValue().getDailyQuestLastCompletedDate());
    }

    @Test
    void getProfileState_throwsWhenLearnerMissing() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.getProfileState(supabaseUserId));

        assertEquals("Learner profile not found for current user.", ex.getMessage());
        verify(repository, never()).save(any(LearnerProfileState.class));
    }

    @Test
    void getProfileState_resetsQuestProgressWhenDateKeyIsStale() {
        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now().minusDays(1))
                .dailyQuestProgress(new LinkedHashMap<>(Map.of(
                        "complete-lesson", 4,
                        "defeat-monster", 2
                )))
                .dailyQuestStreak(2)
                .learningStreak(1)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.getProfileState(supabaseUserId);

        assertEquals(LocalDate.now().toString(), response.dailyQuests().dateKey());
        assertTrue(response.dailyQuests().quests().stream().allMatch(q -> q.progress() == 0));
    }

    @Test
    void recordDailyQuestEvent_sameDayLessonCompletionDoesNotIncrementLearningStreakAgain() {
        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(new LinkedHashMap<>())
                .dailyQuestStreak(1)
                .learningStreak(5)
                .learningStreakLastCompletedDate(LocalDate.now())
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", 1);

        assertEquals(5, response.dailyQuests().learningStreak());
    }

    @Test
    void recordDailyQuestEvent_sameDayDailyCompletionDoesNotIncrementStreakAgain() {
        Map<String, Integer> progress = new LinkedHashMap<>();
        progress.put("complete-lesson", 0);
        progress.put("defeat-monster", 1);
        progress.put("claim-reward", 1);

        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(progress)
                .dailyQuestStreak(4)
                .dailyQuestLastCompletedDate(LocalDate.now())
                .learningStreak(3)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", 1);

        assertTrue(response.dailyQuests().completedToday());
        assertEquals(4, response.dailyQuests().streak());
    }

    @Test
    void recordDailyQuestEvent_defaultsNullAmountToOne() {
        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(new LinkedHashMap<>())
                .dailyQuestStreak(0)
                .learningStreak(0)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.recordDailyQuestEvent(supabaseUserId, "monster_defeated", null);

        int defeatMonsterProgress = response.dailyQuests().quests().stream()
                .filter(q -> q.id().equals("defeat-monster"))
                .findFirst()
                .orElseThrow()
                .progress();
        assertEquals(1, defeatMonsterProgress);
        verify(achievementService).recordEvent(eq(learnerId), eq("monster_defeated"), eq(null), eq("player-service"), eq(null), eq(null));
    }

    @Test
    void getProfileState_sanitizesPersistedProgressKeysAndNegativeValues() {
        Map<String, Integer> dirtyProgress = new LinkedHashMap<>();
        dirtyProgress.put("", 6);
        dirtyProgress.put("complete-lesson", -4);
        dirtyProgress.put("defeat-monster", null);
        dirtyProgress.put("claim-reward", 2);

        LearnerProfileState existing = LearnerProfileState.builder()
                .learnerId(learnerId)
                .learner(learner)
                .avatarPreset("mage")
                .dailyQuestDateKey(LocalDate.now())
                .dailyQuestProgress(dirtyProgress)
                .dailyQuestStreak(0)
                .learningStreak(0)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findById(learnerId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerProfileState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearnerProfileStateResponse response = service.getProfileState(supabaseUserId);

        int completeLessonProgress = response.dailyQuests().quests().stream()
                .filter(q -> q.id().equals("complete-lesson"))
                .findFirst()
                .orElseThrow()
                .progress();
        int defeatMonsterProgress = response.dailyQuests().quests().stream()
                .filter(q -> q.id().equals("defeat-monster"))
                .findFirst()
                .orElseThrow()
                .progress();
        int claimRewardProgress = response.dailyQuests().quests().stream()
                .filter(q -> q.id().equals("claim-reward"))
                .findFirst()
                .orElseThrow()
                .progress();

        assertEquals(0, completeLessonProgress);
        assertEquals(0, defeatMonsterProgress);
        assertEquals(2, claimRewardProgress);
    }
}
