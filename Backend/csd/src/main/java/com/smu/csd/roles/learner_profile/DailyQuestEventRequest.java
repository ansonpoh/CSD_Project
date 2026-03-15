package com.smu.csd.roles.learner_profile;

public record DailyQuestEventRequest(
    String eventType,
    Integer amount
) {}
