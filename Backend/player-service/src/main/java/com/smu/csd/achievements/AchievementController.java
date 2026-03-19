package com.smu.csd.achievements;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/learner/me/achievements")
public class AchievementController {
    private final AchievementService achievementService;

    public AchievementController(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    @GetMapping
    public ResponseEntity<List<AchievementProgressResponse>> getMyAchievements(Authentication authentication) {
        return ResponseEntity.ok(achievementService.getMyAchievements(getSupabaseUserId(authentication)));
    }

    @PostMapping("/events")
    public ResponseEntity<Void> recordEvent(Authentication authentication, @RequestBody AchievementEventRequest request) {
        UUID supabaseUserId = getSupabaseUserId(authentication);
        achievementService.recordEventForSupabaseUser(
            supabaseUserId,
            request == null ? null : request.eventType(),
            request == null ? null : request.eventValue(),
            "player-service",
            request == null ? null : request.idempotencyKey(),
            request == null ? null : request.payload()
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{achievementId}/claim")
    public ResponseEntity<AchievementProgressResponse> claimAchievement(
        Authentication authentication,
        @PathVariable UUID achievementId
    ) {
        return ResponseEntity.ok(achievementService.claimAchievementForSupabaseUser(
            getSupabaseUserId(authentication),
            achievementId
        ));
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
