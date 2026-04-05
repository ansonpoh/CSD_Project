package com.smu.csd.learner;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LearnerAnalyticsResponse {
    private int currentLevel;
    private int currentExp;
    private int expToNextLevel;

    private int currentStreak;
    private int longestStreak;

    private int topicsCompleted;
    private int topicsInProgress;
    private int topicsNotStarted;

    private int quizzesAttempted;
    private double averageQuizScore;
    private int bossCompletions;

    /** Sum of {@code xp_delta} from {@code learner_xp} for the last 7 calendar days (inclusive of today). */
    private int expGainedLast7Days;

    private List<ExpHistoryEntry> expHistory;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpHistoryEntry {
        private String date;
        private int expGained;
    }
}