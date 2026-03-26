package com.smu.csd.quiz.question_bank;

import java.util.List;

public record BankQuestionRequest(
    String scenarioText,
    boolean isMultiSelect,
    List<BankQuestionOptionRequest> options
) {}