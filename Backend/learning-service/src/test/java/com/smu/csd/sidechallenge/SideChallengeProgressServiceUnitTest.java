package com.smu.csd.sidechallenge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.LearnerDto;

class SideChallengeProgressServiceUnitTest {

    private SideChallengeRepository sideChallengeRepository;
    private SideChallengeProgressRepository progressRepository;
    private RestTemplate restTemplate;
    private SideChallengeProgressService service;

    @BeforeEach
    void setUp() {
        sideChallengeRepository = mock(SideChallengeRepository.class);
        progressRepository = mock(SideChallengeProgressRepository.class);
        restTemplate = mock(RestTemplate.class);
        service = new SideChallengeProgressService(sideChallengeRepository, progressRepository, restTemplate);
        ReflectionTestUtils.setField(service, "playerServiceUrl", "http://player-service-test");
    }

    @Test
    void getMyProgress_returnsDefaultSnapshotWhenNoProgressRowExists() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID challengeId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 0, 1));
        when(progressRepository.findProgress(learnerId, challengeId)).thenReturn(Optional.empty());

        SideChallengeProgressSnapshot snapshot = service.getMyProgress(supabaseUserId, challengeId);

        assertFalse(snapshot.completed());
        assertEquals(0, snapshot.attempts());
        assertNull(snapshot.lastResult());
    }

    @Test
    void getMyProgress_normalizesNullableFieldsFromDatabaseProjection() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID challengeId = UUID.randomUUID();
        SideChallengeProgressRepository.ProgressRow row = mock(SideChallengeProgressRepository.ProgressRow.class);
        when(row.getCompleted()).thenReturn(null);
        when(row.getAttempts()).thenReturn(null);
        when(row.getLastResult()).thenReturn("lost");
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 10, 2));
        when(progressRepository.findProgress(learnerId, challengeId)).thenReturn(Optional.of(row));

        SideChallengeProgressSnapshot snapshot = service.getMyProgress(supabaseUserId, challengeId);

        assertFalse(snapshot.completed());
        assertEquals(0, snapshot.attempts());
        assertEquals("lost", snapshot.lastResult());
    }

    @Test
    void recordAttempt_updatesExistingProgressWithoutInsert() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID challengeId = UUID.randomUUID();
        SideChallengeProgressRepository.ProgressRow row = mock(SideChallengeProgressRepository.ProgressRow.class);
        when(row.getCompleted()).thenReturn(true);
        when(row.getAttempts()).thenReturn(4);
        when(row.getLastResult()).thenReturn("won");
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 5, 1));
        when(sideChallengeRepository.existsById(challengeId)).thenReturn(true);
        when(progressRepository.updateAttempt(learnerId, challengeId, true)).thenReturn(1);
        when(progressRepository.findProgress(learnerId, challengeId)).thenReturn(Optional.of(row));

        SideChallengeProgressSnapshot snapshot = service.recordAttempt(supabaseUserId, challengeId, true);

        assertTrue(snapshot.completed());
        assertEquals(4, snapshot.attempts());
        assertEquals("won", snapshot.lastResult());
        verify(progressRepository, never()).insertAttempt(learnerId, challengeId, true);
    }

    @Test
    void recordAttempt_insertsWhenNoExistingProgressIsUpdated() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID challengeId = UUID.randomUUID();
        SideChallengeProgressRepository.ProgressRow row = mock(SideChallengeProgressRepository.ProgressRow.class);
        when(row.getCompleted()).thenReturn(false);
        when(row.getAttempts()).thenReturn(1);
        when(row.getLastResult()).thenReturn("lost");
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 15, 3));
        when(sideChallengeRepository.existsById(challengeId)).thenReturn(true);
        when(progressRepository.updateAttempt(learnerId, challengeId, false)).thenReturn(0);
        when(progressRepository.findProgress(learnerId, challengeId)).thenReturn(Optional.of(row));

        SideChallengeProgressSnapshot snapshot = service.recordAttempt(supabaseUserId, challengeId, false);

        assertFalse(snapshot.completed());
        assertEquals(1, snapshot.attempts());
        assertEquals("lost", snapshot.lastResult());
        verify(progressRepository).insertAttempt(learnerId, challengeId, false);
    }

    @Test
    void recordAttempt_throwsWhenChallengeDoesNotExist() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID challengeId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 0, 1));
        when(sideChallengeRepository.existsById(challengeId)).thenReturn(false);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.recordAttempt(supabaseUserId, challengeId, true)
        );

        assertEquals("Side challenge not found.", exception.getMessage());
        verify(progressRepository, never()).updateAttempt(learnerId, challengeId, true);
        verify(progressRepository, never()).insertAttempt(learnerId, challengeId, true);
    }

    @Test
    void getMyProgress_throwsWhenSupabaseUserMissing() {
        UUID challengeId = UUID.randomUUID();

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.getMyProgress(null, challengeId)
        );

        assertEquals("Missing authenticated user.", exception.getMessage());
        verify(restTemplate, never()).getForObject(anyString(), eq(LearnerDto.class));
    }

    @Test
    void getMyProgress_throwsWhenLearnerLookupFails() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID challengeId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenThrow(new RuntimeException("downstream failed"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.getMyProgress(supabaseUserId, challengeId)
        );

        assertEquals("Learner profile not found.", exception.getMessage());
    }
}
