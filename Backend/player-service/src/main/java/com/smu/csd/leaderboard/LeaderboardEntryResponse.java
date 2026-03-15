package com.smu.csd.leaderboard;

import java.util.UUID;

public record LeaderboardEntryResponse(
        UUID learnerId,
        String username,
        int totalXp,
        long rank
) {}
