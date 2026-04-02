package com.smu.csd.learner;

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

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class LearnerControllerTest {

    @Mock
    private LearnerService service;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private LearnerController controller;

    private UUID learnerId;
    private UUID supabaseUserId;
    private Learner learner;

    @BeforeEach
    void setUp() {
        learnerId = UUID.randomUUID();
        supabaseUserId = UUID.randomUUID();
        learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .full_name("Alice")
                .level(1)
                .total_xp(0)
                .gold(0)
                .is_active(true)
                .build();
    }

    @Test
    void getAllLearners_returnsServiceResponse() {
        List<Learner> expected = List.of(learner);
        when(service.getAllLearners()).thenReturn(expected);

        ResponseEntity<List<Learner>> response = controller.getAllLearners();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
    }

    @Test
    void getLearnerById_returnsServiceResponse() throws ResourceNotFoundException {
        when(service.getById(learnerId)).thenReturn(learner);

        ResponseEntity<Learner> response = controller.getLearnerById(learnerId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(learner, response.getBody());
        verify(service).getById(learnerId);
    }

    @Test
    void getCurrentLearner_readsJwtSubject() throws ResourceNotFoundException {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.getBySupabaseUserId(supabaseUserId)).thenReturn(learner);

        ResponseEntity<Learner> response = controller.getCurrentLearner(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(learner, response.getBody());
        verify(service).getBySupabaseUserId(supabaseUserId);
    }

    @Test
    void checkLearnerExists_returnsServiceResponse() {
        when(service.existsBySupabaseUserId(supabaseUserId)).thenReturn(true);

        ResponseEntity<Boolean> response = controller.checkLearnerExists(supabaseUserId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(true, response.getBody());
        verify(service).existsBySupabaseUserId(supabaseUserId);
    }

    @Test
    void addLearner_callsServiceAndReturnsCreated() throws ResourceAlreadyExistsException {
        when(service.createLearner(
                learner.getSupabaseUserId(),
                learner.getUsername(),
                learner.getEmail(),
                learner.getFull_name()
        )).thenReturn(learner);

        ResponseEntity<Learner> response = controller.addLearner(learner);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(learner, response.getBody());
        verify(service).createLearner(
                learner.getSupabaseUserId(),
                learner.getUsername(),
                learner.getEmail(),
                learner.getFull_name()
        );
    }

    @Test
    void updateLearner_callsServiceWithBodyFields() throws ResourceNotFoundException {
        Learner updateRequest = Learner.builder()
                .username("alice2")
                .full_name("Alice New")
                .total_xp(220)
                .level(2)
                .gold(80)
                .is_active(false)
                .build();

        when(service.updateLearner(
                learnerId,
                "alice2",
                "Alice New",
                220,
                2,
                80,
                false
        )).thenReturn(learner);

        ResponseEntity<Learner> response = controller.updateLearner(learnerId, updateRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(learner, response.getBody());
        verify(service).updateLearner(
                learnerId,
                "alice2",
                "Alice New",
                220,
                2,
                80,
                false
        );
    }

    @Test
    void awardXp_callsServiceWithRequestPayload() throws ResourceNotFoundException {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.awardXpAndGoldBySupabaseUserId(supabaseUserId, 150, 20)).thenReturn(learner);

        ResponseEntity<Learner> response = controller.awardXp(
                authentication,
                new LearnerController.AwardXpRequest(150, 20)
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(learner, response.getBody());
        verify(service).awardXpAndGoldBySupabaseUserId(supabaseUserId, 150, 20);
    }

    @Test
    void awardXp_allowsNullRequestBody() throws ResourceNotFoundException {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(service.awardXpAndGoldBySupabaseUserId(supabaseUserId, null, null)).thenReturn(learner);

        ResponseEntity<Learner> response = controller.awardXp(authentication, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(learner, response.getBody());
        verify(service).awardXpAndGoldBySupabaseUserId(supabaseUserId, null, null);
    }

    @Test
    void deleteLearner_returnsNoContent() throws ResourceNotFoundException {
        ResponseEntity<Void> response = controller.deleteLearner(learnerId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(service).deleteLearner(learnerId);
    }
}
