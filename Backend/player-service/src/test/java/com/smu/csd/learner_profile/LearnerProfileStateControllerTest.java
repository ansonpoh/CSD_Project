package com.smu.csd.learner_profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
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
class LearnerProfileStateControllerTest {

    @Mock
    private LearnerProfileStateService service;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private LearnerProfileStateController controller;

    private UUID supabaseUserId;
    private Jwt jwt;
    private LearnerProfileStateResponse sampleResponse;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        sampleResponse = new LearnerProfileStateResponse(
                "azure-knight",
                new LearnerProfileStateResponse.DailyQuestState(
                        "2026-04-02",
                        3,
                        "2026-04-01",
                        true,
                        2,
                        "2026-04-02",
                        List.of()
                )
        );
    }

    @Test
    void getMyProfileState_returnsServiceResponse() {
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.getProfileState(supabaseUserId)).thenReturn(sampleResponse);

        ResponseEntity<LearnerProfileStateResponse> response = controller.getMyProfileState(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(sampleResponse, response.getBody());
        verify(service).getProfileState(supabaseUserId);
    }

    @Test
    void updateAvatarPreset_forwardsPayload() {
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.updateAvatarPreset(supabaseUserId, "forest-ranger")).thenReturn(sampleResponse);

        ResponseEntity<LearnerProfileStateResponse> response = controller.updateAvatarPreset(
                authentication,
                new AvatarPresetRequest("forest-ranger")
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(sampleResponse, response.getBody());
        verify(service).updateAvatarPreset(supabaseUserId, "forest-ranger");
    }

    @Test
    void updateAvatarPreset_allowsNullRequestBody() {
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.updateAvatarPreset(supabaseUserId, null)).thenReturn(sampleResponse);

        ResponseEntity<LearnerProfileStateResponse> response = controller.updateAvatarPreset(authentication, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(sampleResponse, response.getBody());
        verify(service).updateAvatarPreset(supabaseUserId, null);
    }

    @Test
    void recordDailyQuestEvent_forwardsPayload() {
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.recordDailyQuestEvent(supabaseUserId, "lesson_completed", 2)).thenReturn(sampleResponse);

        ResponseEntity<LearnerProfileStateResponse> response = controller.recordDailyQuestEvent(
                authentication,
                new DailyQuestEventRequest("lesson_completed", 2)
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(sampleResponse, response.getBody());
        verify(service).recordDailyQuestEvent(supabaseUserId, "lesson_completed", 2);
    }

    @Test
    void recordDailyQuestEvent_allowsNullRequestBody() {
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.recordDailyQuestEvent(supabaseUserId, null, null)).thenReturn(sampleResponse);

        ResponseEntity<LearnerProfileStateResponse> response = controller.recordDailyQuestEvent(authentication, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(sampleResponse, response.getBody());
        verify(service).recordDailyQuestEvent(supabaseUserId, null, null);
    }
}
