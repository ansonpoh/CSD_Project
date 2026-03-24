package com.smu.csd.maps;

import java.util.UUID;
import java.time.LocalDateTime;

import org.hibernate.annotations.UuidGenerator;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.FetchType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.smu.csd.roles.Administrator;
import com.smu.csd.roles.Contributor;
import com.smu.csd.contents.topics.Topic;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "maps", name = "map")
public class Map {
    public enum Status {
        PENDING_REVIEW, APPROVED, REJECTED
    }

    @Id
    @UuidGenerator
    @Column(name = "map_id")
    private UUID mapId;
    @Column
    private String name;
    @Column
    private String description;
    @Column
    private String asset;
    @ManyToOne
    @JoinColumn(name = "world_id")
    private World world;

    @Builder.Default
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.APPROVED;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_contributor_id", referencedColumnName = "contributor_id")
    private Contributor submittedByContributor;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_admin_id", referencedColumnName = "administrator_id")
    private Administrator approvedByAdmin;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Builder.Default
    @Column(name = "published")
    private Boolean published = Boolean.TRUE;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by_admin_id", referencedColumnName = "administrator_id")
    private Administrator publishedByAdmin;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id", referencedColumnName = "topic_id")
    private Topic topic;

}
