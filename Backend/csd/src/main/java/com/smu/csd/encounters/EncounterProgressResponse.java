package com.smu.csd.encounters;

import java.util.UUID;

public record EncounterProgressResponse(
    UUID npcId,
    UUID monsterId,
    boolean npcInteracted,
    boolean monsterUnlocked,
    boolean monsterDefeated,
    boolean rewardClaimed,
    int attempts,
    int wins,
    int losses,
    int lossStreak
) {}
