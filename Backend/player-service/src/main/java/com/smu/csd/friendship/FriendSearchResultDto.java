package com.smu.csd.friendship;

import java.util.UUID;

public record FriendSearchResultDto(
        UUID learnerId,
        String username,
        Integer level,
        Boolean isActive,
        String relationship
) {}
