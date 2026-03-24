package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smu.csd.friendship.FriendUserSummaryDto;

public record ChatConversationDto(
        UUID chatConversationId,
        FriendUserSummaryDto friend,
        LocalDateTime createdAt,
        LocalDateTime lastMessageAt
) {
}
