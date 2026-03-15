package com.smu.csd.quiz.question_bank;

import java.util.UUID;

public record BankQuestionOptionResponse(
    UUID bankOptionId,
    String optionText,
    boolean isCorrect
) {}