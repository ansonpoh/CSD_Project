package com.smu.csd.learner_progress;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smu.csd.achievements.AchievementService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class LearnerLessonProgressServiceTest {

    @Mock
    private LearnerLessonProgressRepository repository;
    @Mock
    private LearnerRepository learnerRepository;
    @Mock
    private AchievementService achievementService;

    @InjectMocks
    private LearnerLessonProgressService service;

    private UUID supabaseUserId;
    private UUID learnerId;
    private Learner learner;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        learnerId = UUID.randomUUID();
        learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("learner")
                .email("learner@example.com")
                .is_active(true)
                .build();
    }

    @Test
    void getMyProgress_mapsRepositoryRowsToResponse() {
        UUID contentId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();

        LearnerLessonProgress row = LearnerLessonProgress.builder()
                .lessonProgressId(UUID.randomUUID())
                .learner(learner)
                .contentId(contentId)
                .topicId(topicId)
                .npcId(npcId)
                .status(LearnerLessonProgress.Status.ENROLLED)
                .enrolledAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerId(learnerId)).thenReturn(List.of(row));

        List<LessonProgressResponse> result = service.getMyProgress(supabaseUserId);

        assertEquals(1, result.size());
        assertEquals(learnerId, result.get(0).learnerId());
        assertEquals(contentId, result.get(0).contentId());
        assertEquals("ENROLLED", result.get(0).status());
    }

    @Test
    void getMyProgress_returnsEmptyListWhenNoRows() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerId(learnerId)).thenReturn(List.of());

        List<LessonProgressResponse> result = service.getMyProgress(supabaseUserId);

        assertTrue(result.isEmpty());
    }

    @Test
    void enroll_createsNewProgressWhenMissing() {
        UUID contentId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        LessonProgressRequest req = new LessonProgressRequest(contentId, topicId, npcId);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learnerId, contentId)).thenReturn(Optional.empty());
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse response = service.enroll(supabaseUserId, req);

        assertEquals("ENROLLED", response.status());
        assertEquals(topicId, response.topicId());
        assertEquals(npcId, response.npcId());
        assertNotNull(response.enrolledAt());
        verify(achievementService, never()).recordEvent(any(), any(), any(), any(), any(), any());
    }

    @Test
    void enroll_doesNotDowngradeCompletedStatus() {
        UUID contentId = UUID.randomUUID();
        LessonProgressRequest req = new LessonProgressRequest(contentId, UUID.randomUUID(), UUID.randomUUID());

        LearnerLessonProgress existing = LearnerLessonProgress.builder()
                .lessonProgressId(UUID.randomUUID())
                .learner(learner)
                .contentId(contentId)
                .status(LearnerLessonProgress.Status.COMPLETED)
                .enrolledAt(LocalDateTime.now().minusDays(2))
                .completedAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learnerId, contentId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse response = service.enroll(supabaseUserId, req);

        assertEquals("COMPLETED", response.status());
        assertNotNull(response.completedAt());
    }

    @Test
    void enroll_updatesExistingEnrolledProgressFields() {
        UUID contentId = UUID.randomUUID();
        UUID updatedTopicId = UUID.randomUUID();
        UUID updatedNpcId = UUID.randomUUID();
        LessonProgressRequest req = new LessonProgressRequest(contentId, updatedTopicId, updatedNpcId);

        LocalDateTime originalEnrolledAt = LocalDateTime.now().minusDays(3);
        LocalDateTime originalUpdatedAt = LocalDateTime.now().minusDays(2);
        LearnerLessonProgress existing = LearnerLessonProgress.builder()
                .lessonProgressId(UUID.randomUUID())
                .learner(learner)
                .contentId(contentId)
                .topicId(UUID.randomUUID())
                .npcId(UUID.randomUUID())
                .status(LearnerLessonProgress.Status.ENROLLED)
                .enrolledAt(originalEnrolledAt)
                .updatedAt(originalUpdatedAt)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learnerId, contentId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse response = service.enroll(supabaseUserId, req);

        assertEquals("ENROLLED", response.status());
        assertEquals(updatedTopicId, response.topicId());
        assertEquals(updatedNpcId, response.npcId());
        assertEquals(originalEnrolledAt, response.enrolledAt());

        ArgumentCaptor<LearnerLessonProgress> captor = ArgumentCaptor.forClass(LearnerLessonProgress.class);
        verify(repository).save(captor.capture());
        assertNotNull(captor.getValue().getUpdatedAt());
        assertTrue(captor.getValue().getUpdatedAt().isAfter(originalUpdatedAt));
    }

    @Test
    void complete_createsWhenMissingAndEmitsAchievementEvent() {
        UUID contentId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        LessonProgressRequest req = new LessonProgressRequest(contentId, topicId, npcId);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learnerId, contentId)).thenReturn(Optional.empty());
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse response = service.complete(supabaseUserId, req);

        assertEquals("COMPLETED", response.status());
        assertNotNull(response.enrolledAt());
        assertNotNull(response.completedAt());

        verify(achievementService).recordEvent(
                eq(learnerId),
                eq("lesson_completed"),
                eq(1),
                eq("player-service"),
                eq("lesson_completed:" + learnerId + ":" + contentId),
                eq(null)
        );
    }

    @Test
    void complete_preservesExistingCompletedAt() {
        UUID contentId = UUID.randomUUID();
        LocalDateTime originalCompletedAt = LocalDateTime.now().minusDays(3);
        LessonProgressRequest req = new LessonProgressRequest(contentId, UUID.randomUUID(), UUID.randomUUID());

        LearnerLessonProgress existing = LearnerLessonProgress.builder()
                .lessonProgressId(UUID.randomUUID())
                .learner(learner)
                .contentId(contentId)
                .status(LearnerLessonProgress.Status.ENROLLED)
                .enrolledAt(LocalDateTime.now().minusDays(4))
                .completedAt(originalCompletedAt)
                .updatedAt(LocalDateTime.now().minusDays(2))
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learnerId, contentId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse response = service.complete(supabaseUserId, req);

        assertEquals("COMPLETED", response.status());
        assertEquals(originalCompletedAt, response.completedAt());
        verify(achievementService).recordEvent(
                eq(learnerId),
                eq("lesson_completed"),
                eq(1),
                eq("player-service"),
                eq("lesson_completed:" + learnerId + ":" + contentId),
                eq(null)
        );
    }

    @Test
    void complete_setsEnrolledAtWhenMissing() {
        UUID contentId = UUID.randomUUID();
        LessonProgressRequest req = new LessonProgressRequest(contentId, UUID.randomUUID(), UUID.randomUUID());

        LearnerLessonProgress existing = LearnerLessonProgress.builder()
                .lessonProgressId(UUID.randomUUID())
                .learner(learner)
                .contentId(contentId)
                .status(LearnerLessonProgress.Status.ENROLLED)
                .enrolledAt(null)
                .completedAt(null)
                .updatedAt(LocalDateTime.now().minusDays(2))
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndContentId(learnerId, contentId)).thenReturn(Optional.of(existing));
        when(repository.save(any(LearnerLessonProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LessonProgressResponse response = service.complete(supabaseUserId, req);

        assertNotNull(response.enrolledAt());
        assertNotNull(response.completedAt());

        ArgumentCaptor<LearnerLessonProgress> captor = ArgumentCaptor.forClass(LearnerLessonProgress.class);
        verify(repository).save(captor.capture());
        assertNotNull(captor.getValue().getEnrolledAt());
        assertEquals(LearnerLessonProgress.Status.COMPLETED, captor.getValue().getStatus());
    }

    @Test
    void getMyProgress_throwsWhenLearnerMissing() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.getMyProgress(supabaseUserId));

        assertEquals("Learner profile not found for current user.", ex.getMessage());
        verify(repository, never()).findByLearnerLearnerId(any());
    }

    @Test
    void enroll_throwsWhenLearnerMissing() {
        LessonProgressRequest req = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.enroll(supabaseUserId, req));

        assertEquals("Learner profile not found for current user.", ex.getMessage());
        verify(repository, never()).save(any(LearnerLessonProgress.class));
    }

    @Test
    void complete_throwsWhenLearnerMissing() {
        LessonProgressRequest req = new LessonProgressRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.complete(supabaseUserId, req));

        assertEquals("Learner profile not found for current user.", ex.getMessage());
        verify(repository, never()).save(any(LearnerLessonProgress.class));
        verify(achievementService, never()).recordEvent(any(), any(), any(), any(), any(), any());
    }
}
