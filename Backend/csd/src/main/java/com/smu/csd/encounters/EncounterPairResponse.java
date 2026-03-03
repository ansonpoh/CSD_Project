package com.smu.csd.encounters;

import java.util.UUID;

public record EncounterPairResponse(
    UUID npcId,
    String npcName,
    UUID monsterId,
    String monsterName,
    boolean bossEncounter,
    int encounterOrder
) {}
