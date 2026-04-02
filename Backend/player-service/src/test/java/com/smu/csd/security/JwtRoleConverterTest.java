package com.smu.csd.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class JwtRoleConverterTest {

    private final JwtRoleConverter converter = new JwtRoleConverter();

    @Test
    void convert_usesAppRoleClaimWhenPresent() {
        Jwt jwt = jwtWithClaims(Map.of("app_role", " contributor "));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_CONTRIBUTOR", singleAuthority(token));
    }

    @Test
    void convert_usesRolePriorityWhenRolesCollectionContainsMultiple() {
        Jwt jwt = jwtWithClaims(Map.of("roles", List.of("learner", "admin")));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_ADMIN", singleAuthority(token));
    }

    @Test
    void convert_usesAppMetadataRolesWhenTopLevelClaimsMissing() {
        Jwt jwt = jwtWithClaims(Map.of("app_metadata", Map.of("roles", List.of("learner", "contributor"))));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_CONTRIBUTOR", singleAuthority(token));
    }

    @Test
    void convert_ignoresUnsupportedRoleAndUsesFallbackRoleClaim() {
        Jwt jwt = jwtWithClaims(Map.of(
                "app_role", "superuser",
                "role", "learner"
        ));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_LEARNER", singleAuthority(token));
    }

    private static Jwt jwtWithClaims(Map<String, Object> claims) {
        return new Jwt(
                "token-value",
                Instant.now(),
                Instant.now().plusSeconds(300),
                Map.of("alg", "none"),
                withSubjectClaim(claims)
        );
    }

    private static Map<String, Object> withSubjectClaim(Map<String, Object> claims) {
        java.util.HashMap<String, Object> merged = new java.util.HashMap<>(claims);
        merged.put("sub", UUID.randomUUID().toString());
        return merged;
    }

    private static String singleAuthority(AbstractAuthenticationToken token) {
        return token.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElseThrow();
    }
}
