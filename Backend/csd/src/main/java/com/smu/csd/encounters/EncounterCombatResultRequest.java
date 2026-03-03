package com.smu.csd.encounters;

import java.util.UUID;

public record EncounterCombatResultRequest(
    UUID mapId,
    UUID npcId,
    UUID monsterId,
    Boolean won
) {}
