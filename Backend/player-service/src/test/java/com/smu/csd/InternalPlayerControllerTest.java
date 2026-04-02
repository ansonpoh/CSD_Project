package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;
import com.smu.csd.learner_progress.LearnerLessonProgress;
import com.smu.csd.learner_progress.LearnerLessonProgressRepository;

@ExtendWith(MockitoExtension.class)
class InternalPlayerControllerTest {

    @Mock
    private LearnerRepository learnerRepository;

    @Mock
    private LearnerLessonProgressRepository learnerLessonProgressRepository;

    @Mock
    private LeaderboardService leaderboardService;

    @InjectMocks
    private InternalPlayerController controller;

    private UUID supabaseUserId;
    private UUID learnerId;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        learnerId = UUID.randomUUID();
    }

    @Test
    void getLearnerBySupabaseId_returnsNotFoundWhenLearnerMissing() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        ResponseEntity<Map<String, Object>> response = controller.getLearnerBySupabaseId(supabaseUserId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void getLearnerBySupabaseId_returnsDefaultsWhenStatsAreNull() {
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .total_xp(null)
                .level(null)
                .gold(null)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);

        ResponseEntity<Map<String, Object>> response = controller.getLearnerBySupabaseId(supabaseUserId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(learnerId, response.getBody().get("learnerId"));
        assertEquals(0, response.getBody().get("totalXp"));
        assertEquals(1, response.getBody().get("level"));
        assertEquals(0, response.getBody().get("gold"));
    }

    @Test
    void awardXp_updatesStatsAndLeaderboardUsingSafeDefaults() {
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .total_xp(300)
                .gold(20)
                .level(1)
                .build();

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(learnerRepository.save(any(Learner.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Map<String, Object>> response = controller.awardXp(
                learnerId,
                new InternalPlayerController.AwardXpRequestDto(100, null)
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(400, response.getBody().get("totalXp"));
        assertEquals(3, response.getBody().get("level"));
        assertEquals(20, response.getBody().get("gold"));
        verify(learnerRepository).save(learner);
        verify(leaderboardService).upsertLearnerScore(learner);
    }

    @Test
    void checkAllCompleted_returnsFalseWhenContentIdsEmpty() {
        InternalPlayerController.ProgressCheckRequestDto request =
                new InternalPlayerController.ProgressCheckRequestDto(learnerId, List.of());

        ResponseEntity<Boolean> response = controller.checkAllCompleted(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(false, response.getBody());
        verify(learnerLessonProgressRepository, never())
                .countByLearnerLearnerIdAndContentIdInAndStatus(any(), any(), any());
    }

    @Test
    void checkAllCompleted_returnsTrueWhenCompletedCountMatchesRequestedCount() {
        List<UUID> contentIds = List.of(UUID.randomUUID(), UUID.randomUUID());
        InternalPlayerController.ProgressCheckRequestDto request =
                new InternalPlayerController.ProgressCheckRequestDto(learnerId, contentIds);

        when(learnerLessonProgressRepository.countByLearnerLearnerIdAndContentIdInAndStatus(
                learnerId,
                contentIds,
                LearnerLessonProgress.Status.COMPLETED
        )).thenReturn(2L);

        ResponseEntity<Boolean> response = controller.checkAllCompleted(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody());
    }

    @Test
    void getCompletedContentIds_returnsRepositoryResponseForValidBatch() {
        UUID contentA = UUID.randomUUID();
        UUID contentB = UUID.randomUUID();
        List<UUID> requested = List.of(contentA, contentB);
        List<UUID> completed = List.of(contentB);

        when(learnerLessonProgressRepository.findCompletedContentIdsByLearnerAndContentIds(
                learnerId,
                requested,
                LearnerLessonProgress.Status.COMPLETED
        )).thenReturn(completed);

        ResponseEntity<List<UUID>> response = controller.getCompletedContentIds(
                new InternalPlayerController.ContentCompletionBatchRequestDto(learnerId, requested)
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(completed, response.getBody());
        verify(learnerLessonProgressRepository).findCompletedContentIdsByLearnerAndContentIds(
                eq(learnerId),
                eq(requested),
                eq(LearnerLessonProgress.Status.COMPLETED)
        );
    }
}
