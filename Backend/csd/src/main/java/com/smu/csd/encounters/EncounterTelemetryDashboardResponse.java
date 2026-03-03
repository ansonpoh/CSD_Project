package com.smu.csd.encounters;

public record EncounterTelemetryDashboardResponse(
    long mapEntered,
    long npcInteracted,
    long monsterUnlocked,
    long combatStarted,
    long combatWon,
    long combatLost,
    long rewardClaimed,
    double talkRate,
    double unlockRate,
    double winRate,
    double lossRate,
    double rewardClaimRate
) {}
