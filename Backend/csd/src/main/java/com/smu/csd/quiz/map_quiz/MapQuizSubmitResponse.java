package com.smu.csd.quiz.map_quiz;

import java.util.UUID;

public record MapQuizSubmitResponse(
    UUID attemptId,
    boolean passed,
    int score,
    int totalQuestions
) {}