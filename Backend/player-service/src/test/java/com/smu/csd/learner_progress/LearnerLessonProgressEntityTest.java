package com.smu.csd.learner_progress;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class LearnerLessonProgressEntityTest {

    @Test
    void prePersist_setsDefaultsWhenFieldsAreNull() {
        LearnerLessonProgress progress = LearnerLessonProgress.builder()
                .lessonProgressId(null)
                .enrolledAt(null)
                .updatedAt(null)
                .status(null)
                .build();

        progress.prePersist();

        assertNotNull(progress.getLessonProgressId());
        assertNotNull(progress.getEnrolledAt());
        assertNotNull(progress.getUpdatedAt());
        assertEquals(LearnerLessonProgress.Status.ENROLLED, progress.getStatus());
    }

    @Test
    void prePersist_preservesExistingValuesWhenPresent() {
        UUID existingId = UUID.randomUUID();
        LocalDateTime enrolledAt = LocalDateTime.now().minusDays(2);
        LocalDateTime updatedAt = LocalDateTime.now().minusDays(1);

        LearnerLessonProgress progress = LearnerLessonProgress.builder()
                .lessonProgressId(existingId)
                .enrolledAt(enrolledAt)
                .updatedAt(updatedAt)
                .status(LearnerLessonProgress.Status.COMPLETED)
                .build();

        progress.prePersist();

        assertEquals(existingId, progress.getLessonProgressId());
        assertEquals(enrolledAt, progress.getEnrolledAt());
        assertEquals(updatedAt, progress.getUpdatedAt());
        assertEquals(LearnerLessonProgress.Status.COMPLETED, progress.getStatus());
    }
}
