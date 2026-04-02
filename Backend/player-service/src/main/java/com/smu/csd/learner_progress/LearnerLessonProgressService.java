package com.smu.csd.learner_progress;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.achievements.AchievementService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@Service
public class LearnerLessonProgressService {

    private final LearnerLessonProgressRepository repository;
    private final LearnerRepository learnerRepository;
    private final AchievementService achievementService;

    public LearnerLessonProgressService(
        LearnerLessonProgressRepository repository,
        LearnerRepository learnerRepository,
        AchievementService achievementService
    ) {
        this.repository = repository;
        this.learnerRepository = learnerRepository;
        this.achievementService = achievementService;
    }

    public List<LessonProgressResponse> getMyProgress(UUID supabaseUserId) {
        Learner learner = requireLearner(supabaseUserId);
        return repository.findByLearnerLearnerId(learner.getLearnerId()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public LessonProgressResponse enroll(UUID supabaseUserId, LessonProgressRequest req) {
        Learner learner = requireLearner(supabaseUserId);
        LocalDateTime now = LocalDateTime.now();

        LearnerLessonProgress progress = repository
            .findByLearnerLearnerIdAndContentId(learner.getLearnerId(), req.contentId())
            .orElseGet(() -> LearnerLessonProgress.builder()
                .learner(learner)
                .contentId(req.contentId())
                .status(LearnerLessonProgress.Status.ENROLLED)
                .enrolledAt(now)
                .updatedAt(now)
                .build());

        if (progress.getStatus() != LearnerLessonProgress.Status.COMPLETED) {
            progress.setStatus(LearnerLessonProgress.Status.ENROLLED);
        }
        progress.setTopicId(req.topicId());
        progress.setNpcId(req.npcId());
        progress.setUpdatedAt(now);

        return toResponse(repository.save(progress));
    }

    @Transactional
    public LessonProgressResponse complete(UUID supabaseUserId, LessonProgressRequest req) {
        Learner learner = requireLearner(supabaseUserId);
        LocalDateTime now = LocalDateTime.now();

        LearnerLessonProgress progress = repository
            .findByLearnerLearnerIdAndContentId(learner.getLearnerId(), req.contentId())
            .orElseGet(() -> LearnerLessonProgress.builder()
                .learner(learner)
                .contentId(req.contentId())
                .enrolledAt(now)
                .updatedAt(now)
                .status(LearnerLessonProgress.Status.ENROLLED)
                .build());

        progress.setTopicId(req.topicId());
        progress.setNpcId(req.npcId());
        progress.setStatus(LearnerLessonProgress.Status.COMPLETED);
        if (progress.getCompletedAt() == null) progress.setCompletedAt(now);
        if (progress.getEnrolledAt() == null) progress.setEnrolledAt(now);
        progress.setUpdatedAt(now);

        LearnerLessonProgress saved = repository.save(progress);
        achievementService.recordEvent(
            learner.getLearnerId(),
            "lesson_completed",
            1,
            "player-service",
            "lesson_completed:" + learner.getLearnerId() + ":" + req.contentId(),
            null
        );

        return toResponse(saved);
    }

    private Learner requireLearner(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) {
            throw new IllegalArgumentException("Learner profile not found for current user.");
        }
        return learner;
    }

    private LessonProgressResponse toResponse(LearnerLessonProgress p) {
        return new LessonProgressResponse(
            p.getLessonProgressId(),
            p.getLearner().getLearnerId(),
            p.getContentId(),
            p.getTopicId(),
            p.getNpcId(),
            p.getStatus().name(),
            p.getEnrolledAt(),
            p.getCompletedAt(),
            p.getUpdatedAt()
        );
    }
}
