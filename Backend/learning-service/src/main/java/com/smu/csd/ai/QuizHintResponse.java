package com.smu.csd.ai;

public record QuizHintResponse(
    String hintText,
    String hintStrength,
    boolean alreadyUsedForQuestion
) {}
