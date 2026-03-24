package com.smu.csd.learner_profile;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.achievements.AchievementService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@Service
public class LearnerProfileStateService {
    private static final String DEFAULT_AVATAR_PRESET = "azure-knight";
    private static final String LESSON_COMPLETED_EVENT = "lesson_completed";
    private static final List<QuestDefinition> QUEST_DEFS = List.of(
        new QuestDefinition("complete-lesson", "Finish 1 lesson", 1, LESSON_COMPLETED_EVENT),
        new QuestDefinition("defeat-monster", "Defeat 1 monster", 1, "monster_defeated"),
        new QuestDefinition("claim-reward", "Claim 1 quest reward", 1, "reward_claimed")
    );

    private final LearnerProfileStateRepository repository;
    private final LearnerRepository learnerRepository;
    private final AchievementService achievementService;

    public LearnerProfileStateService(
        LearnerProfileStateRepository repository,
        LearnerRepository learnerRepository,
        AchievementService achievementService
    ) {
        this.repository = repository;
        this.learnerRepository = learnerRepository;
        this.achievementService = achievementService;
    }

    @Transactional
    public LearnerProfileStateResponse getProfileState(UUID supabaseUserId) {
        LearnerProfileState state = ensureCurrentState(loadOrCreateState(requireLearner(supabaseUserId)));
        return toResponse(repository.save(state));
    }

    @Transactional
    public LearnerProfileStateResponse updateAvatarPreset(UUID supabaseUserId, String avatarPreset) {
        LearnerProfileState state = ensureCurrentState(loadOrCreateState(requireLearner(supabaseUserId)));
        state.setAvatarPreset(normalizeAvatarPreset(avatarPreset));
        return toResponse(repository.save(state));
    }

    @Transactional
    public LearnerProfileStateResponse recordDailyQuestEvent(UUID supabaseUserId, String eventType, Integer amount) {
        LearnerProfileState state = ensureCurrentState(loadOrCreateState(requireLearner(supabaseUserId)));
        applyEvent(state, eventType, amount);
        updateDailyCompletion(state);
        LearnerProfileState saved = repository.save(state);
        achievementService.recordEvent(
            saved.getLearnerId(),
            eventType,
            amount,
            "player-service",
            null,
            null
        );
        return toResponse(saved);
    }

    private LearnerProfileState loadOrCreateState(Learner learner) {
        return repository.findById(learner.getLearnerId())
            .orElseGet(() -> LearnerProfileState.builder()
                .learner(learner)
                .learnerId(learner.getLearnerId())
                .avatarPreset(DEFAULT_AVATAR_PRESET)
                .dailyQuestDateKey(today())
                .dailyQuestProgress(new LinkedHashMap<>())
                .dailyQuestStreak(0)
                .learningStreak(0)
                .build());
    }

    private LearnerProfileState ensureCurrentState(LearnerProfileState state) {
        LocalDate currentDate = today();
        LocalDate stateDate = state.getDailyQuestDateKey();

        state.setAvatarPreset(normalizeAvatarPreset(state.getAvatarPreset()));
        state.setDailyQuestStreak(Math.max(0, safeInt(state.getDailyQuestStreak())));
        state.setLearningStreak(Math.max(0, safeInt(state.getLearningStreak())));

        if (!currentDate.equals(stateDate)) {
            state.setDailyQuestDateKey(currentDate);
            state.setDailyQuestProgress(new LinkedHashMap<>());
        } else {
            state.setDailyQuestProgress(sanitizeProgress(state.getDailyQuestProgress()));
        }

        return state;
    }

    private void applyEvent(LearnerProfileState state, String eventType, Integer amount) {
        String normalizedEvent = eventType == null ? "" : eventType.trim();
        int normalizedAmount = Math.max(0, amount == null ? 1 : amount);

        Map<String, Integer> progress = sanitizeProgress(state.getDailyQuestProgress());
        for (QuestDefinition quest : QUEST_DEFS) {
            if (quest.eventType().equals(normalizedEvent)) {
                progress.put(quest.id(), progress.getOrDefault(quest.id(), 0) + normalizedAmount);
            }
        }
        state.setDailyQuestProgress(progress);

        if (LESSON_COMPLETED_EVENT.equals(normalizedEvent) && normalizedAmount > 0) {
            LocalDate lastLessonDate = state.getLearningStreakLastCompletedDate();
            LocalDate currentDate = today();
            if (!currentDate.equals(lastLessonDate)) {
                int nextLearningStreak = yesterday().equals(lastLessonDate)
                    ? Math.max(1, safeInt(state.getLearningStreak()) + 1)
                    : 1;
                state.setLearningStreak(nextLearningStreak);
                state.setLearningStreakLastCompletedDate(currentDate);
            }
        }
    }

    private void updateDailyCompletion(LearnerProfileState state) {
        boolean allComplete = QUEST_DEFS.stream()
            .allMatch(quest -> state.getDailyQuestProgress().getOrDefault(quest.id(), 0) >= quest.goal());
        if (!allComplete || today().equals(state.getDailyQuestLastCompletedDate())) {
            return;
        }

        int nextStreak = yesterday().equals(state.getDailyQuestLastCompletedDate())
            ? Math.max(1, safeInt(state.getDailyQuestStreak()) + 1)
            : 1;
        state.setDailyQuestStreak(nextStreak);
        state.setDailyQuestLastCompletedDate(today());
    }

    private LearnerProfileStateResponse toResponse(LearnerProfileState state) {
        updateDailyCompletion(state);
        List<LearnerProfileStateResponse.DailyQuestProgress> quests = QUEST_DEFS.stream()
            .map(quest -> {
                int progress = Math.max(0, state.getDailyQuestProgress().getOrDefault(quest.id(), 0));
                return new LearnerProfileStateResponse.DailyQuestProgress(
                    quest.id(),
                    quest.label(),
                    quest.goal(),
                    quest.eventType(),
                    progress,
                    progress >= quest.goal()
                );
            })
            .toList();

        boolean completedToday = quests.stream().allMatch(LearnerProfileStateResponse.DailyQuestProgress::completed);
        return new LearnerProfileStateResponse(
            state.getAvatarPreset(),
            new LearnerProfileStateResponse.DailyQuestState(
                formatDate(state.getDailyQuestDateKey()),
                safeInt(state.getDailyQuestStreak()),
                formatDate(state.getDailyQuestLastCompletedDate()),
                completedToday,
                safeInt(state.getLearningStreak()),
                formatDate(state.getLearningStreakLastCompletedDate()),
                quests
            )
        );
    }

    private Learner requireLearner(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) {
            throw new IllegalArgumentException("Learner profile not found for current user.");
        }
        return learner;
    }

    private Map<String, Integer> sanitizeProgress(Map<String, Integer> progress) {
        Map<String, Integer> normalized = new LinkedHashMap<>();
        if (progress == null) {
            return normalized;
        }

        progress.forEach((key, value) -> {
            if (key != null && !key.isBlank()) {
                normalized.put(key, Math.max(0, value == null ? 0 : value));
            }
        });
        return normalized;
    }

    private String normalizeAvatarPreset(String avatarPreset) {
        if (avatarPreset == null || avatarPreset.isBlank()) {
            return DEFAULT_AVATAR_PRESET;
        }
        return avatarPreset.trim();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private String formatDate(LocalDate value) {
        return value == null ? null : value.toString();
    }

    private LocalDate today() {
        return LocalDate.now();
    }

    private LocalDate yesterday() {
        return LocalDate.now().minusDays(1);
    }

    private record QuestDefinition(String id, String label, int goal, String eventType) {}
}
