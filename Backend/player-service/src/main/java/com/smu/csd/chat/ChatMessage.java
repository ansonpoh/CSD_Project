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
@Table(schema = "roles", name = "chat_message")
public class ChatMessage {
    @Id
    @UuidGenerator
    @Column(name = "chat_message_id")
    private UUID chatMessageId;

    @Column(name = "chat_conversation_id")
    private UUID chatConversationId;

    @Column(name = "sender_id")
    private UUID senderId;

    @Column(name = "body")
    private String body;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
