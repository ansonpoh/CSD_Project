package com.smu.csd.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class JwtRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private static final String DEFAULT_ROLE = "LEARNER";
    private static final List<String> ROLE_PRIORITY = List.of("ADMIN", "CONTRIBUTOR", "LEARNER");
    private static final Set<String> ALLOWED_ROLES = Set.copyOf(ROLE_PRIORITY);

    private final RestTemplate restTemplate;
    private final ConcurrentMap<UUID, CachedRole> roleCache = new ConcurrentHashMap<>();
    
    @Value("${identity.url:http://localhost:8081}")
    private String identityUrl;

    @Value("${security.role-cache-ttl-seconds:120}")
    private long roleCacheTtlSeconds;

    public JwtRoleConverter() {
        this.restTemplate = new RestTemplate();
    }
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        String role = resolveRoleFromJwt(jwt).orElseGet(() -> determineRole(supabaseUserId));
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private Optional<String> resolveRoleFromJwt(Jwt jwt) {
        if (jwt == null) return Optional.empty();

        String role = normalizeRole(jwt.getClaimAsString("app_role"));
        if (role != null) return Optional.of(role);

        role = normalizeRoleFromObject(jwt.getClaims().get("roles"));
        if (role != null) return Optional.of(role);

        Object appMetadata = jwt.getClaims().get("app_metadata");
        if (appMetadata instanceof Map<?, ?> metadata) {
            role = normalizeRoleFromObject(metadata.get("roles"));
            if (role != null) return Optional.of(role);

            role = normalizeRole(String.valueOf(metadata.get("role")));
            if (role != null) return Optional.of(role);
        }

        role = normalizeRole(jwt.getClaimAsString("role"));
        return Optional.ofNullable(role);
    }

    private String normalizeRoleFromObject(Object value) {
        if (value == null) return null;
        if (value instanceof String text) {
            return normalizeRole(text);
        }
        if (value instanceof Collection<?> values) {
            Set<String> candidateRoles = new HashSet<>();
            for (Object raw : values) {
                String normalized = normalizeRole(raw == null ? null : String.valueOf(raw));
                if (normalized != null) {
                    candidateRoles.add(normalized);
                }
            }
            for (String candidate : ROLE_PRIORITY) {
                if (candidateRoles.contains(candidate)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private String normalizeRole(String value) {
        if (value == null) return null;
        String normalized = value.trim().toUpperCase();
        if (normalized.isEmpty()) return null;
        return ALLOWED_ROLES.contains(normalized) ? normalized : null;
    }

    private String determineRole(UUID supabaseUserId) {
        long now = System.currentTimeMillis();
        CachedRole cachedRole = roleCache.get(supabaseUserId);
        if (cachedRole != null && cachedRole.expiresAtMillis > now) {
            return cachedRole.role;
        }

        String url = identityUrl + "/api/auth/role/internal/" + supabaseUserId;
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> response = restTemplate.getForObject(url, Map.class);
            String role = normalizeRole(response == null ? null : response.get("role"));
            if (role != null) {
                long ttlMillis = Math.max(0L, roleCacheTtlSeconds) * 1000L;
                if (ttlMillis > 0) {
                    roleCache.put(supabaseUserId, new CachedRole(role, now + ttlMillis));
                }
                return role;
            }
        } catch (Exception e) {
            // Fallback
        }
        return DEFAULT_ROLE;
    }

    private record CachedRole(String role, long expiresAtMillis) {}
}
