package com.smu.csd.roles.learner_progress;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record LessonProgressRequest(
    @NotNull UUID contentId,
    UUID topicId,
    UUID npcId
) {}
