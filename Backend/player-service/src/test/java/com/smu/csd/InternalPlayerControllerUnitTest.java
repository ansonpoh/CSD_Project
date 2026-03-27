package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.UUID;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;
import com.smu.csd.learner_progress.LearnerLessonProgressRepository;

public class InternalPlayerControllerUnitTest {

    private InternalPlayerController controller;
    private LearnerRepository learnerRepository;
    private LearnerLessonProgressRepository learnerLessonProgressRepository;
    private LeaderboardService leaderboardService;

    @BeforeEach
    public void setUp() {
        learnerRepository = mock(LearnerRepository.class);
        learnerLessonProgressRepository = mock(LearnerLessonProgressRepository.class);
        leaderboardService = mock(LeaderboardService.class);
        controller = new InternalPlayerController(learnerRepository, learnerLessonProgressRepository, leaderboardService);
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
}
