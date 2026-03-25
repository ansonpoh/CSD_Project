package com.smu.csd.quiz.question_bank;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record BankQuestionResponse(
    UUID bankQuestionId,
    UUID mapId,
    String mapName,
    String scenarioText,
    boolean isMultiSelect,
    String status,
    LocalDateTime createdAt,
    List<BankQuestionOptionResponse> options
) {}