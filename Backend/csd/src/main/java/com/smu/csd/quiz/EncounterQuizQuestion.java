package com.smu.csd.quiz;

import java.util.List;

public record EncounterQuizQuestion(
    String questionId,
    String prompt,
    List<String> options,
    int correctOptionIndex
) {}
