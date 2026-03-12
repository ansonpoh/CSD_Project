package com.smu.csd.quiz;

public record MapQuizOptionRequest(
    String optionText,
    boolean isCorrect
) {}