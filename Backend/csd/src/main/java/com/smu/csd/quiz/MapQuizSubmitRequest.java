package com.smu.csd.quiz;

import java.util.List;
import java.util.UUID;

public record MapQuizSubmitRequest(
    UUID quizId,
    List<MapQuizAnswerRequest> answers
) {}