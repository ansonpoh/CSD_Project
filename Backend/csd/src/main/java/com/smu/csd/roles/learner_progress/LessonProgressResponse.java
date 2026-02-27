package com.smu.csd.roles.learner_progress;

import java.time.LocalDateTime;
import java.util.UUID;

public record LessonProgressResponse(
    UUID lessonProgressId,
    UUID learnerId,
    UUID contentId,
    UUID topicId,
    UUID npcId,
    String status,
    LocalDateTime enrolledAt,
    LocalDateTime completedAt,
    LocalDateTime updatedAt
) {}
