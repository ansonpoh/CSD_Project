package com.smu.csd.learner_progress;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class LearnerLessonProgressControllerTest {

    @Mock
    private LearnerLessonProgressService service;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private LearnerLessonProgressController controller;

    private UUID supabaseUserId;
    private Jwt jwt;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
    }

    @Test
    void getMyProgress_readsJwtSubjectAndReturnsServiceResult() {
        LessonProgressResponse row = new LessonProgressResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "ENROLLED",
                LocalDateTime.now().minusDays(1),
                null,
                LocalDateTime.now()
        );

        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.getMyProgress(supabaseUserId)).thenReturn(List.of(row));

        List<LessonProgressResponse> response = controller.getMyProgress(authentication);

        assertEquals(1, response.size());
        assertEquals(row, response.get(0));
        verify(service).getMyProgress(supabaseUserId);
    }

    @Test
    void enroll_readsJwtSubjectAndForwardsRequest() {
        LessonProgressRequest req = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        LessonProgressResponse expected = new LessonProgressResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                req.contentId(),
                req.topicId(),
                req.npcId(),
                "ENROLLED",
                LocalDateTime.now(),
                null,
                LocalDateTime.now()
        );

        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.enroll(supabaseUserId, req)).thenReturn(expected);

        LessonProgressResponse response = controller.enroll(authentication, req);

        assertEquals(expected, response);
        verify(service).enroll(supabaseUserId, req);
    }

    @Test
    void complete_readsJwtSubjectAndForwardsRequest() {
        LessonProgressRequest req = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        LessonProgressResponse expected = new LessonProgressResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                req.contentId(),
                req.topicId(),
                req.npcId(),
                "COMPLETED",
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.complete(supabaseUserId, req)).thenReturn(expected);

        LessonProgressResponse response = controller.complete(authentication, req);

        assertEquals(expected, response);
        verify(service).complete(supabaseUserId, req);
    }
}
