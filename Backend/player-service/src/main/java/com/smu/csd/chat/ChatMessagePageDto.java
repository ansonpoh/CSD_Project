package com.smu.csd.chat;

import java.util.List;
import java.util.UUID;

public record ChatMessagePageDto(
        List<ChatMessageDto> messages,
        UUID nextCursor
) {
}
