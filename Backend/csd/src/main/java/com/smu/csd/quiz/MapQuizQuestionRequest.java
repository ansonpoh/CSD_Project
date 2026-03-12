package com.smu.csd.quiz;

import java.util.List;

public record MapQuizQuestionRequest(
    String scenarioText,
    int questionOrder,
    List<MapQuizOptionRequest> options
) {}