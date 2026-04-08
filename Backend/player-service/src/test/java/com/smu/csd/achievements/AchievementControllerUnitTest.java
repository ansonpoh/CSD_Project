package com.smu.csd.achievements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

class AchievementControllerUnitTest {

    private AchievementController controller;
    private AchievementService achievementService;

    @BeforeEach
    void setUp() {
        achievementService = mock(AchievementService.class);
        controller = new AchievementController(achievementService);
    }

    @Test
    void getMyAchievementsDelegatesToService() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        List<AchievementProgressResponse> expected = List.of(
                new AchievementProgressResponse(
                        UUID.randomUUID(),
                        "Explorer",
                        "Visit 10 maps",
                        "EXPLORE",
                        "map_visit",
                        "COUNT",
                        10,
                        100,
                        50,
                        false,
                        true,
                        2,
                        false,
                        null,
                        false,
                        null,
                        null
                )
        );
        when(achievementService.getMyAchievements(supabaseUserId)).thenReturn(expected);

        ResponseEntity<List<AchievementProgressResponse>> response = controller.getMyAchievements(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(achievementService).getMyAchievements(supabaseUserId);
    }

    @Test
    void recordEventWithNullRequestPassesNullEventFields() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        ResponseEntity<Void> response = controller.recordEvent(authentication, null);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(achievementService).recordEventForSupabaseUser(
                supabaseUserId,
                null,
                null,
                "player-service",
                null,
                null
        );
    }

    @Test
    void recordEventPassesBodyFieldsToService() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        AchievementEventRequest request = new AchievementEventRequest(
                "lesson_completed",
                1,
                "idem-1",
                Map.of("topic", "verbs")
        );

        ResponseEntity<Void> response = controller.recordEvent(authentication, request);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(achievementService).recordEventForSupabaseUser(
                supabaseUserId,
                "lesson_completed",
                1,
                "player-service",
                "idem-1",
                Map.of("topic", "verbs")
        );
    }

    @Test
    void claimAchievementDelegatesToService() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID achievementId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        AchievementProgressResponse expected = new AchievementProgressResponse(
                achievementId,
                "Collector",
                "Collect 5 items",
                "COLLECT",
                "item_collected",
                "COUNT",
                5,
                50,
                20,
                false,
                true,
                5,
                true,
                null,
                true,
                null,
                null
        );
        when(achievementService.claimAchievementForSupabaseUser(supabaseUserId, achievementId)).thenReturn(expected);

        ResponseEntity<AchievementProgressResponse> response = controller.claimAchievement(authentication, achievementId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(achievementService).claimAchievementForSupabaseUser(supabaseUserId, achievementId);
    }

    private Authentication mockAuthentication(UUID supabaseUserId) {
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(authentication.getAuthorities()).thenReturn(List.of());
        return authentication;
    }
}
