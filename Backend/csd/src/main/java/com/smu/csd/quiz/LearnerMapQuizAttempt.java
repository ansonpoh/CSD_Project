package com.smu.csd.quiz;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.roles.learner.Learner;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "quiz", name = "learner_map_quiz_attempt")
public class LearnerMapQuizAttempt {

    public enum Status {
        IN_PROGRESS, PASSED, FAILED
    }

    @Id
    @UuidGenerator
    @Column(name = "attempt_id")
    private UUID attemptId;

    @ManyToOne
    @JoinColumn(name = "learner_id", nullable = false)
    private Learner learner;

    @ManyToOne
    @JoinColumn(name = "quiz_id", nullable = false)
    private MapQuiz quiz;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false)
    private int score;

    @Column(name = "attempted_at")
    private LocalDateTime attemptedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    void prePersist() {
        if (attemptedAt == null) attemptedAt = LocalDateTime.now();
        if (status == null) status = Status.IN_PROGRESS;
    }
}
