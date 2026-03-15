package com.smu.csd.roles.learner_profile;

import java.util.List;

public record LearnerProfileStateResponse(
    String avatarPreset,
    DailyQuestState dailyQuests
) {
    public record DailyQuestState(
        String dateKey,
        int streak,
        String lastCompletedDate,
        boolean completedToday,
        int learningStreak,
        String lastLessonCompletedDate,
        List<DailyQuestProgress> quests
    ) {}

    public record DailyQuestProgress(
        String id,
        String label,
        int goal,
        String eventType,
        int progress,
        boolean completed
    ) {}
}
