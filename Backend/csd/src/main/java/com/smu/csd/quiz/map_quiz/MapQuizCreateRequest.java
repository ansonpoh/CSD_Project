package com.smu.csd.quiz.map_quiz;

import java.util.UUID;

public record MapQuizCreateRequest(
    UUID mapId,
    String title,
    String description
) {}