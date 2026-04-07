package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerXp;
import com.smu.csd.learner.LearnerXpRepository;
import com.smu.csd.learner.LearnerRepository;
import com.smu.csd.learner_progress.LearnerLessonProgressRepository;

public class InternalPlayerControllerUnitTest {

    private InternalPlayerController controller;
    private LearnerRepository learnerRepository;
    private LearnerLessonProgressRepository learnerLessonProgressRepository;
    private LeaderboardService leaderboardService;
    private LearnerXpRepository learnerXpRepository;

    @BeforeEach
    public void setUp() {
        learnerRepository = mock(LearnerRepository.class);
        learnerLessonProgressRepository = mock(LearnerLessonProgressRepository.class);
        leaderboardService = mock(LeaderboardService.class);
        learnerXpRepository = mock(LearnerXpRepository.class);
        controller = new InternalPlayerController(
                learnerRepository,
                learnerLessonProgressRepository,
                leaderboardService,
                learnerXpRepository
        );
    }

    @Test
    public void testGetLearnerBySupabaseIdSuccess() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(learnerId);
        learner.setSupabaseUserId(supabaseUserId);
        learner.setTotal_xp(100);
        learner.setLevel(2);
        learner.setGold(50);
        
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);

        ResponseEntity<Map<String, Object>> response = controller.getLearnerBySupabaseId(supabaseUserId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(learnerId, response.getBody().get("learnerId"));
        assertEquals(100, response.getBody().get("totalXp"));
    }

    @Test
    public void testGetLearnerBySupabaseIdNotFound() {
        UUID supabaseUserId = UUID.randomUUID();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        ResponseEntity<Map<String, Object>> response = controller.getLearnerBySupabaseId(supabaseUserId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void testGetLearnerBySupabaseIdReturnsDefaultZeroOneZeroWhenLearnerFieldsAreNull() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(UUID.randomUUID());
        learner.setSupabaseUserId(supabaseUserId);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);

        ResponseEntity<Map<String, Object>> response = controller.getLearnerBySupabaseId(supabaseUserId);

        assertEquals(0, response.getBody().get("totalXp"));
        assertEquals(1, response.getBody().get("level"));
        assertEquals(0, response.getBody().get("gold"));
    }

    @Test
    public void testAwardXpUpdatesLearnerStatsAndLeaderboardForFoundLearner() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = new Learner();
        learner.setLearnerId(learnerId);
        learner.setTotal_xp(100);
        learner.setLevel(2);
        learner.setGold(20);

        when(learnerRepository.findById(learnerId)).thenReturn(java.util.Optional.of(learner));
        when(learnerRepository.save(learner)).thenReturn(learner);

        ResponseEntity<Map<String, Object>> response = controller.awardXp(learnerId, new InternalPlayerController.AwardXpRequestDto(50, 30));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(150, response.getBody().get("totalXp"));
        assertEquals(2, response.getBody().get("level"));
        assertEquals(50, response.getBody().get("gold"));
        verify(leaderboardService).upsertLearnerScore(learner);
        verify(learnerXpRepository).save(org.mockito.ArgumentMatchers.any(LearnerXp.class));
    }

    @Test
    public void testCheckAllCompletedReturnsFalseForEmptyContentList() {
        ResponseEntity<Boolean> response = controller.checkAllCompleted(
                new InternalPlayerController.ProgressCheckRequestDto(UUID.randomUUID(), List.of())
        );

        assertEquals(false, response.getBody());
    }

    @Test
    public void testCheckAllCompletedReturnsTrueOnlyWhenCompletedCountMeetsRequestedContentCount() {
        UUID learnerId = UUID.randomUUID();
        List<UUID> contentIds = List.of(UUID.randomUUID(), UUID.randomUUID());
        when(learnerLessonProgressRepository.countByLearnerLearnerIdAndContentIdInAndStatus(
                learnerId,
                contentIds,
                com.smu.csd.learner_progress.LearnerLessonProgress.Status.COMPLETED
        )).thenReturn(1L, 2L);

        assertEquals(false, controller.checkAllCompleted(new InternalPlayerController.ProgressCheckRequestDto(learnerId, contentIds)).getBody());
        assertEquals(true, controller.checkAllCompleted(new InternalPlayerController.ProgressCheckRequestDto(learnerId, contentIds)).getBody());
    }

    @Test
    public void testGetCompletedContentIdsReturnsEmptyListForNullOrInvalidRequestBodies() {
        assertTrue(controller.getCompletedContentIds(null).getBody().isEmpty());
        assertTrue(controller.getCompletedContentIds(new InternalPlayerController.ContentCompletionBatchRequestDto(null, List.of(UUID.randomUUID()))).getBody().isEmpty());
        assertTrue(controller.getCompletedContentIds(new InternalPlayerController.ContentCompletionBatchRequestDto(UUID.randomUUID(), List.of())).getBody().isEmpty());
    }

    @Test
    public void testNpcCompletedAndContentCompletedProxyRepositoryBooleansCorrectly() {
        UUID learnerId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        when(learnerLessonProgressRepository.existsByLearnerLearnerIdAndNpcIdAndStatus(
                learnerId, npcId, com.smu.csd.learner_progress.LearnerLessonProgress.Status.COMPLETED
        )).thenReturn(true);
        when(learnerLessonProgressRepository.existsByLearnerLearnerIdAndContentIdAndStatus(
                learnerId, contentId, com.smu.csd.learner_progress.LearnerLessonProgress.Status.COMPLETED
        )).thenReturn(false);

        assertEquals(true, controller.isNpcCompleted(learnerId, npcId).getBody());
        assertEquals(false, controller.isContentCompleted(learnerId, contentId).getBody());
    }
}
