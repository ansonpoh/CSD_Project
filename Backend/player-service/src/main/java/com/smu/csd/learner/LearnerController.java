package com.smu.csd.learner;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/learner")
public class LearnerController {
    public record AwardXpRequest(Integer xpAwarded, Integer goldAwarded) {}

    private final LearnerService service;

    public LearnerController(LearnerService service) {
        this.service = service;
    }

    @GetMapping("/all")
    public ResponseEntity<List<Learner>> getAllLearners(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size
    ) {
        return ResponseEntity.ok(service.getAllLearners(page, size));
    }

    @GetMapping("/{learner_id}")
    public ResponseEntity<Learner> getLearnerById(@PathVariable UUID learner_id, Authentication authentication)
            throws ResourceNotFoundException {
        ensureSelfOrAdmin(authentication, learner_id);
        return ResponseEntity.ok(service.getById(learner_id));
    }

    @GetMapping("/me")
    public ResponseEntity<Learner> getCurrentLearner(Authentication authentication) throws ResourceNotFoundException {
        UUID supabaseUserId = getSupabaseUserId(authentication);
        return ResponseEntity.ok(service.getBySupabaseUserId(supabaseUserId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/check/{supabaseUserId}")
    public ResponseEntity<Boolean> checkLearnerExists(@PathVariable UUID supabaseUserId) {
        return ResponseEntity.ok(service.existsBySupabaseUserId(supabaseUserId));
    }

    @GetMapping("/internal/learner/check/{supabaseUserId}")
    public ResponseEntity<Boolean> internalCheckLearnerExists(@PathVariable UUID supabaseUserId) {
        return ResponseEntity.ok(service.existsBySupabaseUserId(supabaseUserId));
    }

    @PostMapping("/add")
    public ResponseEntity<Learner> addLearner(
            @Valid @RequestBody Learner learner,
            Authentication authentication
    ) throws ResourceAlreadyExistsException {
        UUID supabaseUserId = getSupabaseUserId(authentication);
        Learner created = service.createLearner(
                supabaseUserId,
                learner.getUsername(),
                learner.getEmail(),
                learner.getFull_name()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{learner_id}")
    public ResponseEntity<Learner> updateLearner(
            @PathVariable UUID learner_id,
            @RequestBody Learner learner,
            Authentication authentication
    )
            throws ResourceNotFoundException {
        ensureSelfOrAdmin(authentication, learner_id);
        Learner updated = service.updateLearner(
                learner_id,
                learner.getUsername(),
                learner.getFull_name(),
                learner.getTotal_xp(),
                learner.getLevel(),
                learner.getGold(),
                learner.getIs_active()
        );
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/me/award-xp")
    public ResponseEntity<Learner> awardXp(
            Authentication authentication,
            @RequestBody AwardXpRequest request
    ) throws ResourceNotFoundException {
        UUID supabaseUserId = getSupabaseUserId(authentication);
        Learner updated = service.awardXpAndGoldBySupabaseUserId(
                supabaseUserId,
                request == null ? null : request.xpAwarded(),
                request == null ? null : request.goldAwarded()
        );
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{learner_id}")
    public ResponseEntity<Void> deleteLearner(@PathVariable UUID learner_id, Authentication authentication)
            throws ResourceNotFoundException {
        ensureSelfOrAdmin(authentication, learner_id);
        service.deleteLearner(learner_id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/me/analytics", "/{id}/analytics"})
    public ResponseEntity<LearnerAnalyticsResponse> getAnalytics(
            @PathVariable(required = false) String id,
            Authentication authentication) throws ResourceNotFoundException {
        
        UUID learnerId;
        
        if (id == null || id.equals("me")) {
            UUID supabaseUserId = getSupabaseUserId(authentication);
            Learner learner = service.getBySupabaseUserId(supabaseUserId);
            learnerId = learner.getLearnerId();
        } else {
            learnerId = UUID.fromString(id);
            ensureSelfOrAdmin(authentication, learnerId);
        }
        
        LearnerAnalyticsResponse analytics = service.getLearnerAnalytics(learnerId);
        return ResponseEntity.ok(analytics);
    }

    private void ensureSelfOrAdmin(Authentication authentication, UUID targetLearnerId) throws ResourceNotFoundException {
        if (isAdmin(authentication)) return;
        UUID supabaseUserId = getSupabaseUserId(authentication);
        Learner currentLearner = service.getBySupabaseUserId(supabaseUserId);
        if (!targetLearnerId.equals(currentLearner.getLearnerId())) {
            throw new AccessDeniedException("You are not allowed to access this learner resource.");
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null
                && authentication.getAuthorities() != null
                && authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (!(principal instanceof Jwt jwt) || jwt.getSubject() == null) {
            throw new AccessDeniedException("Missing or invalid JWT subject.");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            throw new AccessDeniedException("Invalid JWT subject format.");
        }
    }
}
