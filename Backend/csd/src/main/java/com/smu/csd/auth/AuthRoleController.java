package com.smu.csd.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;
import com.smu.csd.roles.learner.LearnerRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthRoleController {
    private final AdministratorRepository administratorRepository;
    private final ContributorRepository contributorRepository;
    private final LearnerRepository learnerRepository;

    @GetMapping("/role/me")
    public ResponseEntity<?> myRole(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID supabaseUserId = UUID.fromString(jwt.getSubject());

        if (administratorRepository.existsBySupabaseUserId(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "admin", "supabaseUserId", supabaseUserId));
        }
        if (contributorRepository.existsBySupabaseUserId(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "contributor", "supabaseUserId", supabaseUserId));
        }
        if (learnerRepository.existsBySupabaseUserId(supabaseUserId)) {
            return ResponseEntity.ok(Map.of("role", "learner", "supabaseUserId", supabaseUserId));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "No role profile found"));
    }
}
