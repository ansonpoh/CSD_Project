package com.smu.csd.learner_progress;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.achievements.AchievementService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

class LearnerLessonProgressServiceUnitTest {

    private LearnerLessonProgressRepository repository;
    private LearnerRepository learnerRepository;
    private AchievementService achievementService;
    private LearnerLessonProgressService service;

    @BeforeEach
    void setUp() {
        repository = mock(LearnerLessonProgressRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        achievementService = mock(AchievementService.class);
        service = new LearnerLessonProgressService(repository, learnerRepository, achievementService);
    }

    @Test
    void getMyProgress_MapsRepositoryRowsIntoLessonProgressResponse() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        LearnerLessonProgress progress = progress(learner, LearnerLessonProgress.Status.ENROLLED);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerId(learner.getLearnerId())).thenReturn(List.of(progress));

        List<LessonProgressResponse> result = service.getMyProgress(supabaseUserId);

        assertEquals(1, result.size());
        assertEquals(progress.getLessonProgressId(), result.get(0).lessonProgressId());
        assertEquals("ENROLLED", result.get(0).status());
    }

    @Test
    void enroll_CreatesNewEnrolledProgressRowWhenNoneExists() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        LessonProgressRequest request = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learner.getLearnerId(), request.contentId())).thenReturn(Optional.empty());
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse result = service.enroll(supabaseUserId, request);

        assertEquals("ENROLLED", result.status());
        assertEquals(request.topicId(), result.topicId());
        assertEquals(request.npcId(), result.npcId());
        assertNotNull(result.enrolledAt());
    }

    @Test
    void enroll_PreservesCompletedStatusWhenReEnrollingAnAlreadyCompletedLesson() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        LessonProgressRequest request = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        LearnerLessonProgress existing = progress(learner, LearnerLessonProgress.Status.COMPLETED);
        existing.setContentId(request.contentId());
        existing.setCompletedAt(LocalDateTime.now().minusDays(1));

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learner.getLearnerId(), request.contentId())).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse result = service.enroll(supabaseUserId, request);

        assertEquals("COMPLETED", result.status());
        assertNotNull(result.completedAt());
    }

    @Test
    void complete_CreatesOrUpdatesProgressSetsTimestampsCorrectlyAndRecordsTheAchievementEvent() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        LessonProgressRequest request = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learner.getLearnerId(), request.contentId())).thenReturn(Optional.empty());
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(achievementService).recordEvent(eq(learner.getLearnerId()), eq("lesson_completed"), eq(1), eq("player-service"), any(String.class), eq(null));

        LessonProgressResponse result = service.complete(supabaseUserId, request);

        assertEquals("COMPLETED", result.status());
        assertNotNull(result.enrolledAt());
        assertNotNull(result.completedAt());
        assertTrue(!result.completedAt().isBefore(result.enrolledAt()));
        verify(achievementService).recordEvent(eq(learner.getLearnerId()), eq("lesson_completed"), eq(1), eq("player-service"), any(String.class), eq(null));
    }

    private Learner learner() {
        return Learner.builder().learnerId(UUID.randomUUID()).supabaseUserId(UUID.randomUUID()).username("learner").is_active(true).build();
    }

    private LearnerLessonProgress progress(Learner learner, LearnerLessonProgress.Status status) {
        LocalDateTime now = LocalDateTime.now();
        return LearnerLessonProgress.builder()
                .lessonProgressId(UUID.randomUUID())
                .learner(learner)
                .contentId(UUID.randomUUID())
                .topicId(UUID.randomUUID())
                .npcId(UUID.randomUUID())
                .status(status)
                .enrolledAt(now.minusDays(1))
                .completedAt(status == LearnerLessonProgress.Status.COMPLETED ? now : null)
                .updatedAt(now)
                .build();
    }
}
