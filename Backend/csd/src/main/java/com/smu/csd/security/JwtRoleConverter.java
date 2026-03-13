package com.smu.csd.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Converts a validated Supabase JWT into a Spring Security authentication token
 * with the correct role by calling the Identity Service (via Gateway).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final RestTemplate restTemplate;

    @Value("${gateway.url:http://csd-gateway:8080}")
    private String gatewayUrl;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String role = determineRole(jwt.getTokenValue());
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private String determineRole(String tokenValue) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(tokenValue);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            String url = gatewayUrl + "/api/auth/role/me";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            
            if (response.getBody() != null && response.getBody().containsKey("role")) {
                return response.getBody().get("role").toString().toUpperCase();
            }
        } catch (Exception e) {
            log.warn("Failed to determine role from Identity Service, falling back to LEARNER", e);
        }
        return "LEARNER";
    }
}