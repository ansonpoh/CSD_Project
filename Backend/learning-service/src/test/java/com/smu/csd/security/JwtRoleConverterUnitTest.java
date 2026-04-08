package com.smu.csd.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

class JwtRoleConverterUnitTest {

    private RestTemplate restTemplate;
    private JwtRoleConverter converter;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        converter = new JwtRoleConverter(restTemplate);
        ReflectionTestUtils.setField(converter, "identityUrl", "http://identity-service:8081");
        ReflectionTestUtils.setField(converter, "roleCacheTtlSeconds", 120L);
    }

    @Test
    void convert_UsesAppRoleClaimWhenPresent() {
        Jwt jwt = jwtWithClaims(Map.of("app_role", " contributor "));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_CONTRIBUTOR", token.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate, never()).getForObject(anyString(), eq(Map.class));
    }

    @Test
    void convert_ResolvesHighestPriorityRoleFromRolesClaim() {
        Jwt jwt = jwtWithClaims(Map.of("roles", List.of("learner", "admin")));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_ADMIN", token.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate, never()).getForObject(anyString(), eq(Map.class));
    }

    @Test
    void convert_UsesIdentityRoleAndCachesBySupabaseUserId() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenReturn(Map.of("role", "CONTRIBUTOR"));

        AbstractAuthenticationToken first = converter.convert(jwt);
        AbstractAuthenticationToken second = converter.convert(jwt);

        assertEquals("ROLE_CONTRIBUTOR", first.getAuthorities().iterator().next().getAuthority());
        assertEquals("ROLE_CONTRIBUTOR", second.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate).getForObject("http://identity-service:8081/api/auth/role/internal/" + userId, Map.class);
    }

    @Test
    void convert_DefaultsToLearnerWhenIdentityRoleIsUnknown() {
        Jwt jwt = jwtWithClaims(Map.of());
        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenReturn(Map.of("role", "GUEST"));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_LEARNER", token.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void convert_DefaultsToLearnerWhenIdentityLookupFails() {
        Jwt jwt = jwtWithClaims(Map.of());
        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenThrow(new RuntimeException("identity unavailable"));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_LEARNER", token.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void convert_UsesAppMetadataRolesWhenTopLevelClaimsAbsent() {
        Jwt jwt = jwtWithClaims(Map.of("app_metadata", Map.of("roles", List.of("learner", "contributor"))));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_CONTRIBUTOR", token.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate, never()).getForObject(anyString(), eq(Map.class));
    }

    @Test
    void convert_UsesAppMetadataRoleFieldWhenRolesMissing() {
        Jwt jwt = jwtWithClaims(Map.of("app_metadata", Map.of("role", "admin")));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_ADMIN", token.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate, never()).getForObject(anyString(), eq(Map.class));
    }

    @Test
    void convert_DoesNotCacheWhenTtlIsZero() {
        ReflectionTestUtils.setField(converter, "roleCacheTtlSeconds", 0L);
        UUID userId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenReturn(Map.of("role", "LEARNER"));

        converter.convert(jwt);
        converter.convert(jwt);

        verify(restTemplate, times(2))
                .getForObject("http://identity-service:8081/api/auth/role/internal/" + userId, Map.class);
    }

    @Test
    void convert_UsesTopLevelRoleClaimWhenOtherClaimsAbsent() {
        Jwt jwt = jwtWithClaims(Map.of("role", " contributor "));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_CONTRIBUTOR", token.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate, never()).getForObject(anyString(), eq(Map.class));
    }

    @Test
    void convert_UsesRolesStringClaimWhenProvidedAsString() {
        Jwt jwt = jwtWithClaims(Map.of("roles", "admin"));

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertEquals("ROLE_ADMIN", token.getAuthorities().iterator().next().getAuthority());
        verify(restTemplate, never()).getForObject(anyString(), eq(Map.class));
    }

    private Jwt jwtWithClaims(Map<String, Object> claims) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(UUID.randomUUID().toString());
        claims.forEach(builder::claim);
        return builder.build();
    }
}
