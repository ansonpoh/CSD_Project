package com.smu.csd.quiz;

import java.util.List;
import java.util.UUID;

public record MapQuizAnswerRequest(
    UUID questionId,
    List<UUID> selectedOptionIds
) {}