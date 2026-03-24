package com.smu.csd.roles.contributor.analytics;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.contributor.Contributor;
import com.smu.csd.roles.contributor.ContributorService;

@RestController
@RequestMapping("/api/contributors/analytics")
public class ContributorAnalyticsController {
    private final ContributorAnalyticsService analyticsService;
    private final ContributorService contributorService;

    public ContributorAnalyticsController(
            ContributorAnalyticsService analyticsService,
            ContributorService contributorService
    ) {
        this.analyticsService = analyticsService;
        this.contributorService = contributorService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<ContributorAnalyticsResponse> getMyAnalytics(Authentication authentication)
            throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        Contributor contributor = contributorService.getBySupabaseUserId(supabaseUserId);
        return ResponseEntity.ok(analyticsService.getAnalytics(contributor.getContributorId()));
    }

    @GetMapping("/{contributorId}")
    @PreAuthorize("hasRole('CONTRIBUTOR') or hasRole('ADMIN')")
    public ResponseEntity<ContributorAnalyticsResponse> getAnalyticsByContributorId(
            @PathVariable UUID contributorId,
            Authentication authentication
    ) throws ResourceNotFoundException {
        if (!hasAdminRole(authentication)) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            UUID supabaseUserId = UUID.fromString(jwt.getSubject());
            Contributor contributor = contributorService.getBySupabaseUserId(supabaseUserId);
            if (!contributorId.equals(contributor.getContributorId())) {
                return ResponseEntity.status(403).build();
            }
        }

        contributorService.getById(contributorId);
        return ResponseEntity.ok(analyticsService.getAnalytics(contributorId));
    }

    private boolean hasAdminRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
}
