package com.smu.csd.contents;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.contents.topics.Topic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(schema = "contents", name = "content")
public class Content {

    public enum Status {
        PENDING_REVIEW, APPROVED, REJECTED
    }

    @Id
    @UuidGenerator
    @Column(name = "content_id")
    private UUID contentId;

    @Column(name = "contributor_id", nullable = false)
    private UUID contributorId;

    @ManyToOne // many contents can belong to one topic
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.PENDING_REVIEW;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "content_fingerprint")
    private String contentFingerprint;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "admin_comments")
    private String adminComments;

    @Column(name = "feedback_date")
    private LocalDateTime feedbackDate;

    @Column(name = "resubmitted_from_id")
    private UUID resubmittedFromId;
}
