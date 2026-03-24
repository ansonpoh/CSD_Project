package com.smu.csd.encounters.dtos;

import java.util.UUID;

public record EncounterTelemetryDashboardDto(
    UUID mapId,
    long combatStarted,
    long combatWon,
    long combatLost,
    long rewardClaimed,
    double winRate,
    double lossRate
) {}
