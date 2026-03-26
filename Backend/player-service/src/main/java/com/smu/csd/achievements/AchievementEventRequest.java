package com.smu.csd.achievements;

import java.util.Map;

public record AchievementEventRequest(
    String eventType,
    Integer eventValue,
    String idempotencyKey,
    Map<String, Object> payload
) {}
