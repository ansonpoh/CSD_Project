package com.smu.csd.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;

public class AuthRoleControllerDownstreamUnitTest {

    private AuthRoleController controller;
    private AdministratorRepository administratorRepository;
    private ContributorRepository contributorRepository;
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        administratorRepository = mock(AdministratorRepository.class);
        contributorRepository = mock(ContributorRepository.class);
        restTemplate = mock(RestTemplate.class);
        controller = new AuthRoleController(administratorRepository, contributorRepository, restTemplate);
    }

    @Test
    void myRole_AdminTakesPrecedenceWhenUserHasAdminAndContributor() {
        UUID userId = UUID.randomUUID();
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = mock(Jwt.class);

        when(authentication.getPrincipal()).thenReturn(jwt);
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(administratorRepository.existsBySupabaseUserIdAndIsActiveTrue(userId)).thenReturn(true);
        when(contributorRepository.existsBySupabaseUserIdAndIsActiveTrue(userId)).thenReturn(true);

        ResponseEntity<?> response = controller.myRole(authentication);

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("admin", body.get("role"));
    }

    @Test
    void hasRole_LearnerReturnsFalseWhenDownstreamPlayerServiceReturns404() {
        UUID userId = UUID.randomUUID();
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = mock(Jwt.class);

        when(authentication.getPrincipal()).thenReturn(jwt);
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(administratorRepository.existsBySupabaseUserIdAndIsActiveTrue(userId)).thenReturn(false);
        when(contributorRepository.existsBySupabaseUserIdAndIsActiveTrue(userId)).thenReturn(false);
        when(restTemplate.getForEntity(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.eq(Boolean.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.NOT_FOUND,
                        "Not Found",
                        HttpHeaders.EMPTY,
                        new byte[0],
                        StandardCharsets.UTF_8
                ));

        ResponseEntity<?> response = controller.hasRole("learner", authentication);

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(false, body.get("hasRole"));
    }
}
