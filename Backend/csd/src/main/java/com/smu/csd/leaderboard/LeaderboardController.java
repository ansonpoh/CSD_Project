package com.smu.csd.leaderboard;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerService;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final LearnerService learnerService;

    public LeaderboardController(LeaderboardService leaderboardService, LearnerService learnerService) {
        this.leaderboardService = leaderboardService;
        this.learnerService = learnerService;
    }

    @GetMapping
    public ResponseEntity<List<LeaderboardEntryResponse>> getLeaderboard(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(leaderboardService.getTop(limit));
    }

    @GetMapping("/me")
    public ResponseEntity<LeaderboardMeResponse> getMyRank(Authentication authentication)
            throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        Learner me = learnerService.getBySupabaseUserId(supabaseUserId);
        return ResponseEntity.ok(leaderboardService.getRank(me.getLearnerId()));
    }

    @PostMapping("/rebuild")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> rebuild() {
        leaderboardService.rebuildFromDatabase();
        return ResponseEntity.accepted().build();
    }
}
