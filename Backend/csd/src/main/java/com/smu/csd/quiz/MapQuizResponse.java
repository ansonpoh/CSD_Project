package com.smu.csd.quiz;

import java.util.List;
import java.util.UUID;

public record MapQuizResponse(
    UUID quizId,
    UUID mapId,
    String title,
    String description,
    boolean isPublished,
    List<MapQuizQuestionResponse> questions
) {}