package com.smu.csd.npcs.npc_map;

import java.util.UUID;

public record NPCMapAssignRequest(
    UUID npcId,
    UUID mapId,
    UUID contentId
) {}
