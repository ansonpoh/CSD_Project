package com.smu.csd.sidechallenge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

class SideChallengeControllerUnitTest {

    private SideChallengeRepository repository;
    private SideChallengeProgressService progressService;
    private SideChallengeController controller;

    @BeforeEach
    void setUp() {
        repository = mock(SideChallengeRepository.class);
        progressService = mock(SideChallengeProgressService.class);
        controller = new SideChallengeController(repository, progressService);
    }

    @Test
    void getByTheme_returnsFirstActiveChallenge() {
        SideChallenge first = challenge("First", "forest", true);
        SideChallenge second = challenge("Second", "forest", true);
        when(repository.findByMapThemeIgnoreCaseAndIsActiveTrue("forest")).thenReturn(List.of(first, second));

        ResponseEntity<SideChallengeController.SideChallengeResponse> response = controller.getByTheme("forest");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(first.getSideChallengeId(), response.getBody().challengeId());
        assertEquals("First", response.getBody().title());
    }

    @Test
    void getByTheme_returnsNotFoundWhenNoActiveChallenge() {
        when(repository.findByMapThemeIgnoreCaseAndIsActiveTrue("desert")).thenReturn(List.of());

        ResponseEntity<SideChallengeController.SideChallengeResponse> response = controller.getByTheme("desert");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void getAll_normalizesPagingAndReturnsMappedRows() {
        SideChallenge c1 = challenge("A", "forest", true);
        SideChallenge c2 = challenge("B", "cave", false);
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(c1, c2)));

        ResponseEntity<List<SideChallengeController.SideChallengeResponse>> response = controller.getAll(-7, 999);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        assertEquals(c1.getSideChallengeId(), response.getBody().get(0).challengeId());
        assertEquals(c2.getSideChallengeId(), response.getBody().get(1).challengeId());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(500, pageable.getPageSize());
    }

    @Test
    void create_persistsChallengeAndReturnsCreatedResponse() {
        SideChallengeController.SideChallengeRequest request = new SideChallengeController.SideChallengeRequest(
                "Order words",
                "Arrange words correctly",
                "forest",
                List.of("hello", "world"),
                80,
                12
        );
        when(repository.save(any(SideChallenge.class))).thenAnswer(invocation -> {
            SideChallenge saved = invocation.getArgument(0);
            saved.setSideChallengeId(UUID.randomUUID());
            return saved;
        });

        ResponseEntity<SideChallengeController.SideChallengeResponse> response = controller.create(request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Order words", response.getBody().title());
        assertEquals(List.of("hello", "world"), response.getBody().orderedTokens());
        assertEquals(80, response.getBody().rewardXp());
        assertEquals(12, response.getBody().rewardAssist());
    }

    @Test
    void update_returnsNotFoundWhenChallengeIsMissing() {
        UUID missingId = UUID.randomUUID();
        SideChallengeController.SideChallengeRequest request = new SideChallengeController.SideChallengeRequest(
                "Title", "Prompt", "forest", List.of("a"), 10, 2
        );
        when(repository.findById(missingId)).thenReturn(Optional.empty());

        ResponseEntity<SideChallengeController.SideChallengeResponse> response = controller.update(missingId, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(repository, never()).save(any(SideChallenge.class));
    }

    @Test
    void recordAttempt_defaultsWonToFalseWhenRequestIsNull() {
        UUID challengeId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = authentication(supabaseUserId);
        when(progressService.recordAttempt(supabaseUserId, challengeId, false))
                .thenReturn(new SideChallengeProgressSnapshot(false, 1, "lost"));

        ResponseEntity<SideChallengeController.SideChallengeProgressResponse> response =
                controller.recordAttempt(challengeId, null, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().completed());
        assertEquals(1, response.getBody().attempts());
        assertEquals("lost", response.getBody().lastResult());
        verify(progressService).recordAttempt(supabaseUserId, challengeId, false);
    }

    @Test
    void getMyProgress_mapsProgressSnapshotFromService() {
        UUID challengeId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = authentication(supabaseUserId);
        when(progressService.getMyProgress(supabaseUserId, challengeId))
                .thenReturn(new SideChallengeProgressSnapshot(true, 3, "won"));

        ResponseEntity<SideChallengeController.SideChallengeProgressResponse> response =
                controller.getMyProgress(challengeId, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().completed());
        assertEquals(3, response.getBody().attempts());
        assertEquals("won", response.getBody().lastResult());
    }

    @Test
    void delete_returnsNotFoundWhenChallengeDoesNotExist() {
        UUID challengeId = UUID.randomUUID();
        when(repository.existsById(challengeId)).thenReturn(false);

        ResponseEntity<Map<String, String>> response = controller.delete(challengeId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(repository, never()).deleteById(challengeId);
    }

    @Test
    void delete_removesChallengeAndReturnsMessage() {
        UUID challengeId = UUID.randomUUID();
        when(repository.existsById(challengeId)).thenReturn(true);

        ResponseEntity<Map<String, String>> response = controller.delete(challengeId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Deleted", response.getBody().get("message"));
        verify(repository).deleteById(challengeId);
    }

    private SideChallenge challenge(String title, String theme, boolean active) {
        SideChallenge challenge = SideChallenge.builder()
                .sideChallengeId(UUID.randomUUID())
                .title(title)
                .prompt(title + " prompt")
                .mapTheme(theme)
                .rewardXp(40)
                .rewardAssist(5)
                .isActive(active)
                .build();
        challenge.setOrderedTokens(List.of("alpha", "beta"));
        return challenge;
    }

    private Authentication authentication(UUID supabaseUserId) {
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        return authentication;
    }
}
