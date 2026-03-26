package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatSettingsDto(
        UUID ownerLearnerId,
        UUID targetLearnerId,
        boolean isMuted,
        boolean isBlocked,
        LocalDateTime updatedAt
) {
}
