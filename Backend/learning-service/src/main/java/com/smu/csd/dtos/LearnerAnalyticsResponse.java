package com.smu.csd.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LearnerAnalyticsResponse {
    private int quizzesAttempted;
    private double averageQuizScore;
    private int bossCompletions;
    private List<ExpHistoryEntry> expHistory;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpHistoryEntry {
        private String date;
        private int expGained;
    }
}