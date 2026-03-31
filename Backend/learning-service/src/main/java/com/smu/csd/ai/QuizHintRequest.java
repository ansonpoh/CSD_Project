package com.smu.csd.ai;

import java.util.List;
import java.util.UUID;

public record QuizHintRequest(
    String questionPrompt,
    List<String> options,
    String questionType,
    List<Integer> correctOptionIndexes,
    UUID mapId,
    UUID monsterId,
    UUID questionId
) {}
