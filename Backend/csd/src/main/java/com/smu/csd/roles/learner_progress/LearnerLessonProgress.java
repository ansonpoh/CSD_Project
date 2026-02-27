package com.smu.csd.roles.learner_progress;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smu.csd.roles.learner.Learner;

import jakarta.persistence.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
    schema = "roles",
    name = "learner_lesson_progress",
    uniqueConstraints = @UniqueConstraint(name = "uq_learner_content", columnNames = {"learner_id", "content_id"})
)
public class LearnerLessonProgress {

    public enum Status {
        ENROLLED, COMPLETED
    }

    @Id
    @Column(name = "learner_lesson_progress_id")
    private UUID lessonProgressId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id", nullable = false)
    private Learner learner;

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @Column(name = "topic_id")
    private UUID topicId;

    @Column(name = "npc_id")
    private UUID npcId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @Column(name = "enrolled_at", nullable = false)
    private LocalDateTime enrolledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (lessonProgressId == null) lessonProgressId = UUID.randomUUID();
        if (enrolledAt == null) enrolledAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (status == null) status = Status.ENROLLED;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
