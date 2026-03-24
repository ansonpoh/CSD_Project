package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatMessageDto(
        UUID chatMessageId,
        UUID chatConversationId,
        UUID senderId,
        String body,
        LocalDateTime createdAt,
        LocalDateTime editedAt,
        LocalDateTime deletedAt,
        boolean mine
) {
}
