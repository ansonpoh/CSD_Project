package com.smu.csd.quiz.map_quiz;

public record MapQuizOptionRequest(
    String optionText,
    boolean isCorrect
) {}