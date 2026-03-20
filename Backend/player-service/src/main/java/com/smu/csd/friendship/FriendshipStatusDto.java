package com.smu.csd.friendship;

import java.util.UUID;

public record FriendshipStatusDto(
        UUID targetLearnerId,
        String relationship
) {}
