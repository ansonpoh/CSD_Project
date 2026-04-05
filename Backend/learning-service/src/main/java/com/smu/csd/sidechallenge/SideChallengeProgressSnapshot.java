package com.smu.csd.sidechallenge;

public record SideChallengeProgressSnapshot(
        boolean completed,
        int attempts,
        String lastResult
) {}
