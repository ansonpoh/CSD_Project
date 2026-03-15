package com.smu.csd.learner_profile;

public record DailyQuestEventRequest(
    String eventType,
    Integer amount
) {}
