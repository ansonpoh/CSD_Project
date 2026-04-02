package com.smu.csd.leaderboard;

import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LeaderboardBootstrapTest {

    @Mock
    private LeaderboardService leaderboardService;

    @InjectMocks
    private LeaderboardBootstrap bootstrap;

    @Test
    void initializeLeaderboard_triggersRebuild() {
        bootstrap.initializeLeaderboard();

        verify(leaderboardService).rebuildFromDatabase();
    }
}
