package com.smu.csd.quiz.map_quiz;

import java.util.List;

public record MapQuizQuestionRequest(
    String scenarioText,
    int questionOrder,
    List<MapQuizOptionRequest> options
) {}