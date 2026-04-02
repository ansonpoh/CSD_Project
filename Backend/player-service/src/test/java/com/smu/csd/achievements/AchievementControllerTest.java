package com.smu.csd.achievements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class AchievementControllerTest {

    @Mock
    private AchievementService achievementService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AchievementController controller;

    @Test
    void getMyAchievements_readsSupabaseUserIdFromJwtSubject() {
        UUID supabaseUserId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        List<AchievementProgressResponse> expected = List.of();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(achievementService.getMyAchievements(supabaseUserId)).thenReturn(expected);

        ResponseEntity<List<AchievementProgressResponse>> response = controller.getMyAchievements(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
    }

    @Test
    void recordEvent_handlesNullRequestBodyAndReturnsNoContent() {
        UUID supabaseUserId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);

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
    void claimAchievement_forwardsRequestToService() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID achievementId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);

        AchievementProgressResponse expected = new AchievementProgressResponse(
                achievementId,
                "name",
                "desc",
                "category",
                "event",
                "COUNTER",
                1,
                10,
                5,
                false,
                true,
                1,
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
    }
}
