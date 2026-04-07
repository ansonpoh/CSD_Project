package com.smu.csd.missions;

import com.smu.csd.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/missions")
@RequiredArgsConstructor
public class MissionController {

    private final MissionService missionService;

    // ── Learner endpoints ────────────────────────────────────────────────────

    /** GET /api/missions/daily — returns up to 2 active missions for today */
    @GetMapping("/daily")
    @PreAuthorize("hasRole('LEARNER')")
    public ResponseEntity<List<LearnerDailyMission>> getDailyMissions(Authentication authentication) {
        UUID learnerId = getLearnerId(authentication);
        return ResponseEntity.ok(missionService.getDailyMissions(learnerId));
    }

    /** POST /api/missions/{missionId}/reflect — submit a reflection */
    @PostMapping("/{missionId}/reflect")
    @PreAuthorize("hasRole('LEARNER')")
    public ResponseEntity<MissionAttempt> submitReflection(
            @PathVariable UUID missionId,
            @RequestBody ReflectRequest request,
            Authentication authentication) throws ResourceNotFoundException {
        UUID learnerId = getLearnerId(authentication);
        MissionAttempt attempt = missionService.submitReflection(learnerId, missionId, request.reflection());
        return ResponseEntity.status(HttpStatus.CREATED).body(attempt);
    }

    // ── Admin endpoints ──────────────────────────────────────────────────────

    /** GET /api/missions — list all missions in the pool */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Mission>> getAllMissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size
    ) {
        return ResponseEntity.ok(missionService.getAllMissions(page, size));
    }

    /** POST /api/missions — create a new mission */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Mission> createMission(@RequestBody CreateMissionRequest request) {
        Mission mission = missionService.createMission(
                request.title(), request.description(), request.type(),
                request.rewardXp(), request.rewardGold());
        return ResponseEntity.status(HttpStatus.CREATED).body(mission);
    }

    /** PATCH /api/missions/{missionId}/active?value=true|false */
    @PatchMapping("/{missionId}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Mission> setActive(
            @PathVariable UUID missionId,
            @RequestParam boolean value) throws ResourceNotFoundException {
        return ResponseEntity.ok(missionService.setActive(missionId, value));
    }

    /** GET /api/missions/flagged — reflections needing admin review */
    @GetMapping("/flagged")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MissionAttempt>> getFlagged() {
        return ResponseEntity.ok(missionService.getFlaggedAttempts());
    }

    /** POST /api/missions/attempts/{attemptId}/review */
    @PostMapping("/attempts/{attemptId}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MissionAttempt> adminReview(
            @PathVariable UUID attemptId,
            @RequestBody AdminReviewRequest request) throws ResourceNotFoundException {
        return ResponseEntity.ok(missionService.adminReview(attemptId, request.approve(), request.note()));
    }

    // ── Records ──────────────────────────────────────────────────────────────

    public record ReflectRequest(String reflection) {}

    public record CreateMissionRequest(
            String title,
            String description,
            Mission.Type type,
            int rewardXp,
            int rewardGold) {}

    public record AdminReviewRequest(boolean approve, String note) {}

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UUID getLearnerId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
