package com.smu.csd.npcs.npc_map;

import java.util.UUID;

public record NPCMapLessonResponse(
    UUID npcId,
    String name,
    String asset,
    UUID contentId,
    String contentTitle,
    String contentBody,
    UUID topicId,
    String topicName,
    String videoKey
) {}