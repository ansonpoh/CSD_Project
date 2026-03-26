package com.smu.csd.friendship;

import java.time.LocalDateTime;
import java.util.UUID;

public record FriendRequestDto(
        UUID friendshipId,
        FriendUserSummaryDto requester,
        FriendUserSummaryDto addressee,
        String status,
        LocalDateTime createdAt
) {}
