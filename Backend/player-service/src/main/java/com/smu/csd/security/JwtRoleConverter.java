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
import java.util.UUID;
import java.util.Map;

@Component
public class JwtRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final RestTemplate restTemplate;

    @Value("${identity.url:http://localhost:8081}")
    private String identityUrl;

    public JwtRoleConverter() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        String role = determineRole(supabaseUserId);
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private String determineRole(UUID supabaseUserId) {
        try {
            String url = identityUrl + "/api/auth/role/internal/" + supabaseUserId;
            @SuppressWarnings("unchecked")
            Map<String, String> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("role")) {
                return response.get("role");
            }
        } catch (Exception e) {
            // Fallback
        }
        return "LEARNER"; 
    }
}