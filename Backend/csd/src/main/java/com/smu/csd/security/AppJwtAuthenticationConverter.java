package com.smu.csd.security;

import lombok.AllArgsConstructor;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;

import java.util.List;
import java.util.UUID;

/**
 * Converts a validated Supabase JWT into a Spring Security authentication token.
 *
 * Extracts the supabaseUserId from the JWT subject claim, looks up the user's
 * role in the database, and returns a JwtAuthenticationToken with the correct
 * ROLE_ADMIN / ROLE_CONTRIBUTOR / ROLE_LEARNER authority.
 *
 * Used by Spring's OAuth2 resource server instead of a custom filter.
 */
@Component
@AllArgsConstructor
public class AppJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final AdministratorRepository administratorRepository;
    private final ContributorRepository contributorRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        String role = determineRole(supabaseUserId);
        return new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private String determineRole(UUID supabaseUserId) {
        if (administratorRepository.existsBySupabaseUserId(supabaseUserId)) {
            return "ADMIN";
        }
        if (contributorRepository.existsBySupabaseUserId(supabaseUserId)) {
            return "CONTRIBUTOR";
        }
        return "LEARNER";  // Default — all registered users are learners
    }
}