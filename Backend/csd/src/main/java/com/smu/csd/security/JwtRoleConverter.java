package com.smu.csd.security;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;
import lombok.AllArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Converts a validated Supabase JWT into a Spring Security authentication token
 * with the correct role (ADMIN, CONTRIBUTOR, or LEARNER) by checking the database.
 *
 * This runs inside the OAuth2 Resource Server flow — the JWT is already
 * cryptographically verified before this converter is called.
 */
@Component
@AllArgsConstructor
public class JwtRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final AdministratorRepository administratorRepository;
    private final ContributorRepository contributorRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        String role = determineRole(supabaseUserId);
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private String determineRole(UUID supabaseUserId) {
        if (administratorRepository.existsBySupabaseUserId(supabaseUserId)) return "ADMIN";
        if (contributorRepository.existsBySupabaseUserId(supabaseUserId)) return "CONTRIBUTOR";
        return "LEARNER";
    }
}