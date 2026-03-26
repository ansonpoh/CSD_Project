package com.smu.csd.friendship;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
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
@Table(schema = "roles", name = "friendship")
public class Friendship {
    @Id
    @UuidGenerator
    @Column(name = "friendship_id")
    private UUID friendshipId;

    @Column(name = "requester_id")
    private UUID requesterId;

    @Column(name = "addressee_id")
    private UUID addresseeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FriendshipStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
