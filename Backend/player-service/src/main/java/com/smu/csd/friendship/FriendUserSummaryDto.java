package com.smu.csd.friendship;

import java.util.UUID;

public record FriendUserSummaryDto(
        UUID learnerId,
        String username,
        Integer level,
        Boolean isActive
) {}
