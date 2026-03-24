package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(schema = "roles", name = "chat_user_settings")
public class ChatUserSettings {
    @Id
    @UuidGenerator
    @Column(name = "chat_user_settings_id")
    private UUID chatUserSettingId;

    @Column(name = "owner_learner_id")
    private UUID ownerLearnerId;

    @Column(name = "target_learner_id")
    private UUID targetLearnerId;

    @Column(name = "is_muted")
    private Boolean isMuted;

    @Column(name = "is_blocked")
    private Boolean isBlocked;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
