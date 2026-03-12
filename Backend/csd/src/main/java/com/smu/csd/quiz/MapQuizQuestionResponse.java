package com.smu.csd.quiz;

import java.util.List;
import java.util.UUID;

public record MapQuizQuestionResponse(
    UUID questionId,
    String scenarioText,
    int questionOrder,
    List<MapQuizOptionResponse> options
) {}