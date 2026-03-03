package com.smu.csd.encounters;

public record EncounterRetryProfile(
    int lossStreak,
    int questionReduction,
    int startingMonsterHpPercent
) {}
