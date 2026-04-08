package com.smu.csd.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.beans.factory.annotation.Value;

/**
 * Resolves the role(s) of the currently authenticated user by extracting their
 * supabase_user_id from the JWT and querying the role tables (admin, contributor, learner).
 * Used during login to verify the user has the selected role, and on session restore to route them.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthRoleController {
    private final AdministratorRepository administratorRepository;
    private final ContributorRepository contributorRepository;
    private final RestTemplate restTemplate;

    @Value("${PLAYER_SERVICE_URL:http://player-service:8084}")
    private String playerServiceUrl;

    @GetMapping("/role/me")
    public ResponseEntity<?> myRole(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID supabaseUserId = parseSupabaseUserId(jwt.getSubject());
        if (supabaseUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid authentication subject"));
        }

        if (administratorRepository.existsBySupabaseUserIdAndIsActiveTrue(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "admin", "supabaseUserId", supabaseUserId));
        }
        if (contributorRepository.existsBySupabaseUserIdAndIsActiveTrue(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "contributor", "supabaseUserId", supabaseUserId));
        }
        
        // Learner role check now relies on internal REST call
        if (checkLearnerExists(supabaseUserId.toString())) {
            return ResponseEntity.ok(Map.of("role", "learner", "supabaseUserId", supabaseUserId));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "No role profile found"));
    }

    @GetMapping("/role/has/{role}")
    public ResponseEntity<?> hasRole(@PathVariable String role, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID supabaseUserId = parseSupabaseUserId(jwt.getSubject());
        if (supabaseUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid authentication subject"));
        }

        boolean hasRole = switch (role.toLowerCase()) {
            case "admin" -> administratorRepository.existsBySupabaseUserIdAndIsActiveTrue(supabaseUserId);
            case "contributor" -> contributorRepository.existsBySupabaseUserIdAndIsActiveTrue(supabaseUserId);
            case "learner" -> checkLearnerExists(supabaseUserId.toString());
            default -> false;
        };

        return ResponseEntity.ok(Map.of("hasRole", hasRole));
    }

    @GetMapping("/role/internal/{supabaseUserId}")
    public ResponseEntity<Map<String, String>> internalGetRole(@PathVariable UUID supabaseUserId) {
        if (administratorRepository.existsBySupabaseUserIdAndIsActiveTrue(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "ADMIN"));
        }
        if (contributorRepository.existsBySupabaseUserIdAndIsActiveTrue(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "CONTRIBUTOR"));
        }
        if (checkLearnerExists(supabaseUserId.toString())) {
            return ResponseEntity.ok(Map.of("role", "LEARNER"));
        }
        return ResponseEntity.notFound().build();
    }

    private boolean checkLearnerExists(String supabaseUserId) {
        try {
            String url = playerServiceUrl + "/api/learner/internal/learner/check/" + supabaseUserId;
            ResponseEntity<Boolean> response = restTemplate.getForEntity(url, Boolean.class);
            return Boolean.TRUE.equals(response.getBody());
        } catch (HttpClientErrorException.NotFound e) {
            return false;
        } catch (Exception e) {
            log.error("Failed to check learner existence for user {} at {}: {}", supabaseUserId, playerServiceUrl, e.getMessage());
            return false;
        }
    }

    private UUID parseSupabaseUserId(String subject) {
        if (subject == null || subject.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
