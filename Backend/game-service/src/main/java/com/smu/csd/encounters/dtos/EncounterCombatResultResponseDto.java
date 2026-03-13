package com.smu.csd.encounters.dtos;

import java.util.UUID;

public record EncounterCombatResultResponseDto(
    UUID mapId,
    UUID monsterId,
    boolean won,
    int attempts,
    int wins,
    int losses,
    int lossStreak,
    boolean monsterDefeated,
    boolean rewardClaimed
) {}
