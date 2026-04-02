package com.smu.csd.leaderboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerService;

@ExtendWith(MockitoExtension.class)
class LeaderboardControllerTest {

    @Mock
    private LeaderboardService leaderboardService;

    @Mock
    private LearnerService learnerService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private LeaderboardController controller;

    @Test
    void getLeaderboard_returnsOkAndServiceResponse() {
        List<LeaderboardEntryResponse> expected = List.of(
                new LeaderboardEntryResponse(UUID.randomUUID(), "alice", 120, 1L)
        );
        when(leaderboardService.getTop(15)).thenReturn(expected);

        ResponseEntity<List<LeaderboardEntryResponse>> response = controller.getLeaderboard(15);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
    }

    @Test
    void getMyRank_readsSubjectAndResolvesLearnerId() throws ResourceNotFoundException {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        Learner learner = Learner.builder().learnerId(learnerId).build();
        LeaderboardMeResponse expected = new LeaderboardMeResponse(learnerId, "alice", 50, 2L);

        when(authentication.getPrincipal()).thenReturn(jwt);
        when(learnerService.getBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(leaderboardService.getRank(learnerId)).thenReturn(expected);

        ResponseEntity<LeaderboardMeResponse> response = controller.getMyRank(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
    }

    @Test
    void rebuild_returnsAcceptedAndTriggersService() {
        ResponseEntity<Void> response = controller.rebuild();

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        verify(leaderboardService).rebuildFromDatabase();
    }
}
