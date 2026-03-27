package com.smu.csd.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;

public class AuthRoleControllerUnitTest {

    private AuthRoleController authRoleController;
    private AdministratorRepository administratorRepository;
    private ContributorRepository contributorRepository;
    private RestTemplate restTemplate;

    @BeforeEach
    public void setUp() {
        administratorRepository = mock(AdministratorRepository.class);
        contributorRepository = mock(ContributorRepository.class);
        restTemplate = mock(RestTemplate.class);
        authRoleController = new AuthRoleController(administratorRepository, contributorRepository, restTemplate);
    }

    @Test
    public void testMyRoleAdmin() {
        UUID userId = UUID.randomUUID();
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = mock(Jwt.class);
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(administratorRepository.existsBySupabaseUserId(userId)).thenReturn(true);

        ResponseEntity<?> response = authRoleController.myRole(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("admin", body.get("role"));
    }

    @Test
    public void testMyRoleContributor() {
        UUID userId = UUID.randomUUID();
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = mock(Jwt.class);
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(administratorRepository.existsBySupabaseUserId(userId)).thenReturn(false);
        when(contributorRepository.existsBySupabaseUserIdAndIsActiveTrue(userId)).thenReturn(true);

        ResponseEntity<?> response = authRoleController.myRole(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("contributor", body.get("role"));
    }
}
