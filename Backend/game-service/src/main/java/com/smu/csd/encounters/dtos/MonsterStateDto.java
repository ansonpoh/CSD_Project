package com.smu.csd.encounters.dtos;

import java.util.UUID;

public record MonsterStateDto(
    UUID monsterId,
    String name,
    boolean boss,
    boolean unlocked,
    boolean monsterDefeated,
    boolean rewardClaimed,
    int attempts,
    int wins,
    int losses,
    int lossStreak
) {}
