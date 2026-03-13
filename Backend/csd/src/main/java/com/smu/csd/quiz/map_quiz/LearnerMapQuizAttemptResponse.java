package com.smu.csd.quiz.map_quiz;

import java.time.LocalDateTime;
import java.util.UUID;

public record LearnerMapQuizAttemptResponse(
    UUID attemptId,
    String status,
    int score,
    int totalQuestions,
    LocalDateTime attemptedAt,
    LocalDateTime completedAt
) {}