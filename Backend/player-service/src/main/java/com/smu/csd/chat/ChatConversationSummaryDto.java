package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smu.csd.friendship.FriendUserSummaryDto;

public record ChatConversationSummaryDto(
        UUID chatConversationId,
        FriendUserSummaryDto friend,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        boolean muted,
        boolean blocked,
        LocalDateTime createdAt
) {
}
