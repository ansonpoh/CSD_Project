package com.smu.csd.quiz.question_bank;

public record BankQuestionOptionRequest(
    String optionText,
    boolean isCorrect
) {}