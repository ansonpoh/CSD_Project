package com.smu.csd.quiz.map_quiz;

import java.util.List;
import java.util.UUID;

public record MapQuizEvaluateRequest(
    UUID quizId,
    UUID questionId,
    List<UUID> selectedOptionIds
) {}
