package com.smu.csd.roles.learner_progress;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;

@Service
public class LearnerLessonProgressService {

    private final LearnerLessonProgressRepository repository;
    private final LearnerRepository learnerRepository;

    public LearnerLessonProgressService(LearnerLessonProgressRepository repository, LearnerRepository learnerRepository) {
        this.repository = repository;
        this.learnerRepository = learnerRepository;
    }

    public List<LessonProgressResponse> getMyProgress(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        return repository.findByLearnerLearnerId(learner.getLearnerId()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public LessonProgressResponse enroll(UUID supabaseUserId, LessonProgressRequest req) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
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
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
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

        return toResponse(repository.save(progress));
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
