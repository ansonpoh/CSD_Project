package com.smu.csd.learner_progress;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record LessonProgressRequest(
    @NotNull UUID contentId,
    UUID topicId,
    UUID npcId
) {}
