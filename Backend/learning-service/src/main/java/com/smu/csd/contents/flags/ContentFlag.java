package com.smu.csd.contents.flags;

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
@Table(schema = "contents", name = "content_flag")
public class ContentFlag {

    public enum FlagReason {
        MISINFORMATION, OFFENSIVE_CONTENT, HARASSMENT, SPAM, COPYRIGHT, OTHER
    }

    public enum FlagStatus {
        OPEN, REVIEWED, DISMISSED
    }

    @Id
    @UuidGenerator
    @Column(name = "content_flag_id")
    private UUID contentFlagId;

    @ManyToOne
    @JoinColumn(name = "content_id")
    private Content content;

    @Column(name = "reported_by")
    private UUID reportedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason")
    private FlagReason reason;

    @Column(name = "details")
    private String details;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private FlagStatus status = FlagStatus.OPEN;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "resolution_notes")
    private String resolutionNotes;
}
