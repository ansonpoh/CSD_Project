package com.smu.csd.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class JwtRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final RestTemplate restTemplate;

    @Value("${IDENTITY_URL:http://localhost:8081}")
    private String identityUrl;

    public JwtRoleConverter() {        this.restTemplate = new RestTemplate();
    }
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        String role = determineRole(supabaseUserId);
        log.info("Resolved role={} for supabaseUserId={}", role, supabaseUserId);
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private String determineRole(UUID supabaseUserId) {
        String url = identityUrl + "/api/auth/role/internal/" + supabaseUserId;
        try {
            log.info("Resolving role for supabaseUserId={} via {}", supabaseUserId, url);
            @SuppressWarnings("unchecked")
            Map<String, String> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("role")) {
                log.info("Identity service returned role={} for supabaseUserId={}", response.get("role"), supabaseUserId);
                return response.get("role");
            }
        } catch (Exception e) {
            log.warn("Role lookup failed for supabaseUserId={} via {}. Falling back to LEARNER.", supabaseUserId, url, e);
        }
        log.warn("Role lookup returned no role for supabaseUserId={}. Falling back to LEARNER.", supabaseUserId);
        return "LEARNER"; 
    }
}