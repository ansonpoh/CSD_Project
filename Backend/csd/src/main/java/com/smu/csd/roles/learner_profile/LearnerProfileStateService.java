package com.smu.csd.roles.learner_profile;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;

import jakarta.annotation.PostConstruct;

@Service
public class LearnerProfileStateService {
    private static final String DEFAULT_AVATAR_PRESET = "azure-knight";
    private static final String LESSON_COMPLETED_EVENT = "lesson_completed";
    private static final TypeReference<Map<String, Integer>> PROGRESS_TYPE = new TypeReference<>() {};
    private static final List<QuestDefinition> QUEST_DEFS = List.of(
        new QuestDefinition("complete-lesson", "Finish 1 lesson", 1, LESSON_COMPLETED_EVENT),
        new QuestDefinition("defeat-monster", "Defeat 1 monster", 1, "monster_defeated"),
        new QuestDefinition("claim-reward", "Claim 1 quest reward", 1, "reward_claimed")
    );

    private final JdbcTemplate jdbcTemplate;
    private final LearnerRepository learnerRepository;
    private final ObjectMapper objectMapper;

    public LearnerProfileStateService(
        JdbcTemplate jdbcTemplate,
        LearnerRepository learnerRepository,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.learnerRepository = learnerRepository;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void ensureTable() {
        jdbcTemplate.execute("""
            create table if not exists public.learner_profile_state (
                learner_id uuid primary key,
                avatar_preset varchar(64),
                daily_quest_date_key varchar(16),
                daily_quest_progress text,
                daily_quest_streak integer not null default 0,
                daily_quest_last_completed_date varchar(16),
                learning_streak integer not null default 0,
                learning_streak_last_completed_date varchar(16),
                created_at timestamp without time zone not null default current_timestamp,
                updated_at timestamp without time zone not null default current_timestamp
            )
            """);
    }

    public LearnerProfileStateResponse getProfileState(UUID supabaseUserId) {
        Learner learner = requireLearner(supabaseUserId);
        StoredState state = ensureCurrentState(loadState(learner.getLearnerId()));
        saveState(learner.getLearnerId(), state);
        return toResponse(state);
    }

    public LearnerProfileStateResponse updateAvatarPreset(UUID supabaseUserId, String avatarPreset) {
        Learner learner = requireLearner(supabaseUserId);
        StoredState existing = ensureCurrentState(loadState(learner.getLearnerId()));
        StoredState updated = new StoredState(
            normalizeAvatarPreset(avatarPreset),
            existing.dateKey(),
            existing.progress(),
            existing.streak(),
            existing.lastCompletedDate(),
            existing.learningStreak(),
            existing.lastLessonCompletedDate()
        );
        saveState(learner.getLearnerId(), updated);
        return toResponse(updated);
    }

    public LearnerProfileStateResponse recordDailyQuestEvent(UUID supabaseUserId, String eventType, Integer amount) {
        Learner learner = requireLearner(supabaseUserId);
        StoredState existing = ensureCurrentState(loadState(learner.getLearnerId()));
        StoredState updated = applyEvent(existing, eventType, amount);
        saveState(learner.getLearnerId(), updated);
        return toResponse(updated);
    }

    private StoredState applyEvent(StoredState state, String eventType, Integer amount) {
        StoredState current = ensureCurrentState(state);
        int normalizedAmount = Math.max(0, amount == null ? 1 : amount);
        String normalizedEvent = eventType == null ? "" : eventType.trim();

        Map<String, Integer> progress = new LinkedHashMap<>(current.progress());
        for (QuestDefinition quest : QUEST_DEFS) {
            if (quest.eventType().equals(normalizedEvent)) {
                progress.put(quest.id(), Math.max(0, progress.getOrDefault(quest.id(), 0) + normalizedAmount));
            }
        }

        int learningStreak = current.learningStreak();
        String lastLessonCompletedDate = current.lastLessonCompletedDate();
        if (LESSON_COMPLETED_EVENT.equals(normalizedEvent) && normalizedAmount > 0) {
            String today = todayKey();
            if (!today.equals(lastLessonCompletedDate)) {
                learningStreak = yesterdayKey().equals(lastLessonCompletedDate)
                    ? Math.max(1, learningStreak + 1)
                    : 1;
                lastLessonCompletedDate = today;
            }
        }

        StoredState updated = new StoredState(
            current.avatarPreset(),
            current.dateKey(),
            progress,
            current.streak(),
            current.lastCompletedDate(),
            learningStreak,
            lastLessonCompletedDate
        );
        return updateDailyCompletion(updated);
    }

    private StoredState updateDailyCompletion(StoredState state) {
        boolean allComplete = QUEST_DEFS.stream()
            .allMatch(quest -> state.progress().getOrDefault(quest.id(), 0) >= quest.goal());
        if (!allComplete || state.dateKey().equals(state.lastCompletedDate())) {
            return state;
        }

        int nextStreak = yesterdayKey().equals(state.lastCompletedDate())
            ? Math.max(1, state.streak() + 1)
            : 1;

        return new StoredState(
            state.avatarPreset(),
            state.dateKey(),
            state.progress(),
            nextStreak,
            state.dateKey(),
            state.learningStreak(),
            state.lastLessonCompletedDate()
        );
    }

    private StoredState ensureCurrentState(StoredState state) {
        if (state == null) {
            return new StoredState(
                DEFAULT_AVATAR_PRESET,
                todayKey(),
                new LinkedHashMap<>(),
                0,
                null,
                0,
                null
            );
        }

        Map<String, Integer> progress = new LinkedHashMap<>(state.progress());
        String currentDate = todayKey();
        if (!currentDate.equals(state.dateKey())) {
            progress.clear();
        }

        return new StoredState(
            normalizeAvatarPreset(state.avatarPreset()),
            currentDate,
            progress,
            Math.max(0, state.streak()),
            emptyToNull(state.lastCompletedDate()),
            Math.max(0, state.learningStreak()),
            emptyToNull(state.lastLessonCompletedDate())
        );
    }

    private LearnerProfileStateResponse toResponse(StoredState rawState) {
        StoredState state = updateDailyCompletion(ensureCurrentState(rawState));
        List<LearnerProfileStateResponse.DailyQuestProgress> quests = QUEST_DEFS.stream()
            .map(quest -> {
                int progress = Math.max(0, state.progress().getOrDefault(quest.id(), 0));
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
            normalizeAvatarPreset(state.avatarPreset()),
            new LearnerProfileStateResponse.DailyQuestState(
                state.dateKey(),
                state.streak(),
                state.lastCompletedDate(),
                completedToday,
                state.learningStreak(),
                state.lastLessonCompletedDate(),
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

    private StoredState loadState(UUID learnerId) {
        List<StoredState> rows = jdbcTemplate.query(
            """
                select
                    learner_id,
                    avatar_preset,
                    daily_quest_date_key,
                    daily_quest_progress,
                    daily_quest_streak,
                    daily_quest_last_completed_date,
                    learning_streak,
                    learning_streak_last_completed_date
                from public.learner_profile_state
                where learner_id = ?
                """,
            this::mapRow,
            learnerId
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    private StoredState mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new StoredState(
            rs.getString("avatar_preset"),
            rs.getString("daily_quest_date_key"),
            readProgress(rs.getString("daily_quest_progress")),
            rs.getInt("daily_quest_streak"),
            rs.getString("daily_quest_last_completed_date"),
            rs.getInt("learning_streak"),
            rs.getString("learning_streak_last_completed_date")
        );
    }

    private void saveState(UUID learnerId, StoredState state) {
        jdbcTemplate.update(
            """
                insert into public.learner_profile_state (
                    learner_id,
                    avatar_preset,
                    daily_quest_date_key,
                    daily_quest_progress,
                    daily_quest_streak,
                    daily_quest_last_completed_date,
                    learning_streak,
                    learning_streak_last_completed_date,
                    updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, current_timestamp)
                on conflict (learner_id) do update
                set avatar_preset = excluded.avatar_preset,
                    daily_quest_date_key = excluded.daily_quest_date_key,
                    daily_quest_progress = excluded.daily_quest_progress,
                    daily_quest_streak = excluded.daily_quest_streak,
                    daily_quest_last_completed_date = excluded.daily_quest_last_completed_date,
                    learning_streak = excluded.learning_streak,
                    learning_streak_last_completed_date = excluded.learning_streak_last_completed_date,
                    updated_at = current_timestamp
                """,
            learnerId,
            normalizeAvatarPreset(state.avatarPreset()),
            state.dateKey(),
            writeProgress(state.progress()),
            Math.max(0, state.streak()),
            state.lastCompletedDate(),
            Math.max(0, state.learningStreak()),
            state.lastLessonCompletedDate()
        );
    }

    private Map<String, Integer> readProgress(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return new LinkedHashMap<>();
        }

        try {
            Map<String, Integer> parsed = objectMapper.readValue(rawValue, PROGRESS_TYPE);
            return parsed == null ? new LinkedHashMap<>() : new LinkedHashMap<>(parsed);
        } catch (Exception ignored) {
            return new LinkedHashMap<>();
        }
    }

    private String writeProgress(Map<String, Integer> progress) {
        try {
            return objectMapper.writeValueAsString(progress == null ? Map.of() : progress);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize learner profile state.", e);
        }
    }

    private String normalizeAvatarPreset(String avatarPreset) {
        if (avatarPreset == null || avatarPreset.isBlank()) {
            return DEFAULT_AVATAR_PRESET;
        }
        return avatarPreset.trim();
    }

    private String todayKey() {
        return LocalDate.now().toString();
    }

    private String yesterdayKey() {
        return LocalDate.now().minusDays(1).toString();
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record QuestDefinition(String id, String label, int goal, String eventType) {}

    private record StoredState(
        String avatarPreset,
        String dateKey,
        Map<String, Integer> progress,
        int streak,
        String lastCompletedDate,
        int learningStreak,
        String lastLessonCompletedDate
    ) {}
}
