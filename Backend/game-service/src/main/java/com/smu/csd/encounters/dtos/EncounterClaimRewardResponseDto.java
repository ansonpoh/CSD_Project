package com.smu.csd.encounters.dtos;

import java.util.UUID;

public record EncounterClaimRewardResponseDto(
    UUID mapId,
    UUID monsterId,
    int xpAwarded,
    int goldAwarded,
    int learnerTotalXp,
    int learnerLevel,
    int learnerGold,
    boolean rewardClaimed
) {}
