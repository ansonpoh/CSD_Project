package com.smu.csd.leaderboard;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class LeaderboardBootstrap {

    private final LeaderboardService leaderboardService;

    public LeaderboardBootstrap(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeLeaderboard() {
        leaderboardService.rebuildFromDatabase();
    }
}
