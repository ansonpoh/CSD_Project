package com.smu.csd.encounters;

import java.util.UUID;

public record EncounterPairAssignRequest(
    UUID npcId,
    UUID monsterId
) {}
