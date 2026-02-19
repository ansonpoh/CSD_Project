package com.smu.csd.ai;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.contents.Content;

import jakarta.persistence.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "ai", name = "ai_moderation_result")
public class AIModerationResult {

    public enum Verdict {
        APPROVED, NEEDS_REVIEW, REJECTED
    }

    @Id
    @UuidGenerator
    @Column(name = "result_id")
    private UUID resultId;

    @ManyToOne // many contents can belong to one topic
    @JoinColumn(name = "content_id", nullable = false)
    private Content content;

    @Column(name = "quality_score", nullable = false)
    private int qualityScore;

    @Column(name = "is_relevant", nullable = false)
    private boolean isRelevant;

    @Column(name = "is_appropriate", nullable = false)
    private boolean isAppropriate;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_verdict", length = 20)
    private Verdict aiVerdict;

    @Column(name = "reasoning", nullable = false, columnDefinition = "TEXT")
    private String reasoning;

    @CreationTimestamp
    @Column(name = "screened_at", updatable = false)
    private LocalDateTime screenedAt;
}
