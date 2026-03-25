package com.smu.csd.quiz.map_quiz;

import java.util.List;
import java.util.UUID;

public record MapQuizQuestionResponse(
    UUID questionId,
    String scenarioText,
    int questionOrder,
    boolean isMultiSelect,
    List<MapQuizOptionResponse> options
) {}