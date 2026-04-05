package com.smu.csd.sidechallenge;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/side-challenges")
@RequiredArgsConstructor
public class SideChallengeController {

    private final SideChallengeRepository repository;
    private final SideChallengeProgressService progressService;

    // ── Learner: fetch challenge for a map theme ─────────────────────────────

    /** GET /api/side-challenges/theme/{theme} — first active challenge for this theme */
    @GetMapping("/theme/{theme}")
    public ResponseEntity<SideChallengeResponse> getByTheme(@PathVariable String theme) {
        return repository.findByMapThemeIgnoreCaseAndIsActiveTrue(theme)
                .stream()
                .findFirst()
                .map(c -> ResponseEntity.ok(toResponse(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/side-challenges/random — random active challenge */
    @GetMapping("/random")
    public ResponseEntity<SideChallengeResponse> getRandomActiveChallenge() {
        List<SideChallenge> activeChallenges = repository.findByIsActiveTrue();
        if (activeChallenges.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        int randomIndex = ThreadLocalRandom.current().nextInt(activeChallenges.size());
        return ResponseEntity.ok(toResponse(activeChallenges.get(randomIndex)));
    }

    /** GET /api/side-challenges/{id}/my-progress */
    @GetMapping("/{id}/my-progress")
    public ResponseEntity<SideChallengeProgressResponse> getMyProgress(
            @PathVariable UUID id,
            Authentication authentication) {
        SideChallengeProgressSnapshot snapshot = progressService.getMyProgress(getSupabaseUserId(authentication), id);
        return ResponseEntity.ok(toProgressResponse(snapshot));
    }

    /** POST /api/side-challenges/{id}/attempt */
    @PostMapping("/{id}/attempt")
    public ResponseEntity<SideChallengeProgressResponse> recordAttempt(
            @PathVariable UUID id,
            @RequestBody SideChallengeAttemptRequest request,
            Authentication authentication) {
        boolean won = request != null && Boolean.TRUE.equals(request.won());
        SideChallengeProgressSnapshot snapshot = progressService.recordAttempt(getSupabaseUserId(authentication), id, won);
        return ResponseEntity.ok(toProgressResponse(snapshot));
    }

    // ── Admin: full CRUD ─────────────────────────────────────────────────────

    /** GET /api/side-challenges — all challenges */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SideChallengeResponse>> getAll() {
        return ResponseEntity.ok(repository.findAll().stream().map(this::toResponse).toList());
    }

    /** POST /api/side-challenges — create */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SideChallengeResponse> create(@RequestBody SideChallengeRequest request) {
        SideChallenge challenge = SideChallenge.builder()
                .title(request.title())
                .prompt(request.prompt())
                .mapTheme(request.mapTheme())
                .rewardXp(request.rewardXp())
                .rewardAssist(request.rewardAssist())
                .build();
        challenge.setOrderedTokens(request.orderedTokens());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(repository.save(challenge)));
    }

    /** PATCH /api/side-challenges/{id} — update */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SideChallengeResponse> update(
            @PathVariable UUID id,
            @RequestBody SideChallengeRequest request) {
        return repository.findById(id).map(c -> {
            c.setTitle(request.title());
            c.setPrompt(request.prompt());
            c.setMapTheme(request.mapTheme());
            c.setOrderedTokens(request.orderedTokens());
            c.setRewardXp(request.rewardXp());
            c.setRewardAssist(request.rewardAssist());
            return ResponseEntity.ok(toResponse(repository.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/side-challenges/{id}/active?value=true|false */
    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SideChallengeResponse> setActive(
            @PathVariable UUID id,
            @RequestParam boolean value) {
        return repository.findById(id).map(c -> {
            c.setActive(value);
            return ResponseEntity.ok(toResponse(repository.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/side-challenges/{id} */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable UUID id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private SideChallengeResponse toResponse(SideChallenge c) {
        return new SideChallengeResponse(
                c.getSideChallengeId(),
                c.getTitle(),
                c.getPrompt(),
                c.getMapTheme(),
                c.getOrderedTokens(),
                c.getRewardXp(),
                c.getRewardAssist(),
                c.isActive()
        );
    }

    private SideChallengeProgressResponse toProgressResponse(SideChallengeProgressSnapshot snapshot) {
        return new SideChallengeProgressResponse(
                snapshot.completed(),
                snapshot.attempts(),
                snapshot.lastResult()
        );
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }

    public record SideChallengeRequest(
            String title,
            String prompt,
            String mapTheme,
            List<String> orderedTokens,
            int rewardXp,
            int rewardAssist
    ) {}

    public record SideChallengeResponse(
            UUID challengeId,
            String title,
            String prompt,
            String mapTheme,
            List<String> orderedTokens,
            int rewardXp,
            int rewardAssist,
            boolean isActive
    ) {}

    public record SideChallengeAttemptRequest(Boolean won) {}

    public record SideChallengeProgressResponse(
            boolean completed,
            int attempts,
            String lastResult
    ) {}
}
