package com.smu.csd.leaderboard;

import java.util.UUID;

public record LeaderboardMeResponse(
        UUID learnerId,
        String username,
        int totalXp,
        long rank
) {}
