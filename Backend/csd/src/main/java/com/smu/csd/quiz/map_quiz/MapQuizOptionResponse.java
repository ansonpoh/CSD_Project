package com.smu.csd.quiz.map_quiz;

import java.util.UUID;

public record MapQuizOptionResponse(
    UUID optionId,
    String optionText,
    Boolean isCorrect  // null for learner view, true/false for admin view
) {}