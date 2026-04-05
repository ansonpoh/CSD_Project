package com.smu.csd.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

class JwtRoleConverterUnitTest {

    private JwtRoleConverter converter;
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        converter = new JwtRoleConverter();
        restTemplate = mock(RestTemplate.class);
        ReflectionTestUtils.setField(converter, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(converter, "identityUrl", "http://identity-service");
        ReflectionTestUtils.setField(converter, "roleCacheTtlSeconds", 3600L);
    }

    @Test
    void convert_UsesAppRoleClaimAndNormalizesLowercaseValues() {
        Jwt jwt = jwt(UUID.randomUUID(), Map.of("app_role", "admin"));

        AbstractAuthenticationToken auth = converter.convert(jwt);

        assertEquals("ROLE_ADMIN", singleAuthority(auth));
    }

    @Test
    void convert_ChoosesHighestPriorityRoleFromRolesCollection() {
        Jwt jwt = jwt(UUID.randomUUID(), Map.of("roles", List.of("learner", "contributor", "admin")));

        AbstractAuthenticationToken auth = converter.convert(jwt);

        assertEquals("ROLE_ADMIN", singleAuthority(auth));
    }

    @Test
    void convert_ResolvesRoleFromAppMetadataWhenTopLevelClaimsAreAbsent() {
        Jwt metadataRolesJwt = jwt(UUID.randomUUID(), Map.of(
                "app_metadata", Map.of("roles", List.of("contributor", "learner"))
        ));
        Jwt metadataRoleJwt = jwt(UUID.randomUUID(), Map.of(
                "app_metadata", Map.of("role", "contributor")
        ));

        assertEquals("ROLE_CONTRIBUTOR", singleAuthority(converter.convert(metadataRolesJwt)));
        assertEquals("ROLE_CONTRIBUTOR", singleAuthority(converter.convert(metadataRoleJwt)));
    }

    @Test
    void convert_FallsBackToIdentityServiceLookupAndCachesRepeatedLookups() {
        UUID userId = UUID.randomUUID();
        when(restTemplate.getForObject("http://identity-service/api/auth/role/internal/" + userId, Map.class))
                .thenReturn(Map.of("role", "contributor"));

        Jwt jwt = jwt(userId, Map.of());

        assertEquals("ROLE_CONTRIBUTOR", singleAuthority(converter.convert(jwt)));
        assertEquals("ROLE_CONTRIBUTOR", singleAuthority(converter.convert(jwt)));
        verify(restTemplate, times(1)).getForObject("http://identity-service/api/auth/role/internal/" + userId, Map.class);
    }

    @Test
    void convert_FallsBackToDefaultLearnerWhenLookupFailsOrReturnsInvalidRole() {
        UUID invalidRoleUser = UUID.randomUUID();
        UUID failingUser = UUID.randomUUID();
        when(restTemplate.getForObject("http://identity-service/api/auth/role/internal/" + invalidRoleUser, Map.class))
                .thenReturn(Map.of("role", "not-a-role"));
        when(restTemplate.getForObject("http://identity-service/api/auth/role/internal/" + failingUser, Map.class))
                .thenThrow(new RuntimeException("boom"));

        assertEquals("ROLE_LEARNER", singleAuthority(converter.convert(jwt(invalidRoleUser, Map.of()))));
        assertEquals("ROLE_LEARNER", singleAuthority(converter.convert(jwt(failingUser, Map.of()))));
    }

    private Jwt jwt(UUID subject, Map<String, Object> claims) {
        Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "none").subject(subject.toString());
        claims.forEach(builder::claim);
        return builder.build();
    }

    private String singleAuthority(AbstractAuthenticationToken auth) {
        GrantedAuthority authority = auth.getAuthorities().iterator().next();
        return authority.getAuthority();
    }
}
