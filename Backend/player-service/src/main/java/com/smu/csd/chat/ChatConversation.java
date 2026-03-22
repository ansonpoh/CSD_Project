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
@Table(schema = "roles", name = "chat_conversation")
public class ChatConversation {
    @Id
    @UuidGenerator
    @Column(name = "chat_conversation_id")
    private UUID chatConversationId;

    @Column(name = "user_a_id")
    private UUID userAId;

    @Column(name = "user_b_id")
    private UUID userBId;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
