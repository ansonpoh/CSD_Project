package com.smu.csd.encounters;

public record EncounterRewardClaimResponse(
    int xpAwarded,
    int learnerTotalXp,
    int learnerLevel,
    EncounterProgressResponse progress
) {}
