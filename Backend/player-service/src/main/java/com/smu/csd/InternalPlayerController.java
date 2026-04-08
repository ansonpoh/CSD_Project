package com.smu.csd;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerXp;
import com.smu.csd.learner.LearnerXpRepository;
import com.smu.csd.learner.LearnerRepository;
import com.smu.csd.learner_progress.LearnerLessonProgress;
import com.smu.csd.learner_progress.LearnerLessonProgressRepository;

import lombok.RequiredArgsConstructor;

/**
 * Controller strictly for internal inter-service communication.
 * Providing Learner and Progress data to other services.
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalPlayerController {

    private final LearnerRepository learnerRepository;
    private final LearnerLessonProgressRepository learnerLessonProgressRepository;
    private final LeaderboardService leaderboardService;
    private final LearnerXpRepository learnerXpRepository;

    // ----- Learner Service mock-endpoints -----
    @GetMapping("/learners/supabase/{supabaseUserId}")
    public ResponseEntity<Map<String, Object>> getLearnerBySupabaseId(@PathVariable UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) return ResponseEntity.notFound().build();
        
        return ResponseEntity.ok(Map.of(
            "learnerId", learner.getLearnerId(),
            "totalXp", learner.getTotal_xp() != null ? learner.getTotal_xp() : 0,
            "level", learner.getLevel() != null ? learner.getLevel() : 1,
            "gold", learner.getGold() != null ? learner.getGold() : 0
        ));
    }

    public record AwardXpRequestDto(Integer xpAwarded, Integer goldAwarded) {}

    @PostMapping("/learners/{learnerId}/award-xp")
    public ResponseEntity<Map<String, Object>> awardXp(@PathVariable UUID learnerId, @RequestBody AwardXpRequestDto request) {
        return learnerRepository.findById(learnerId).map(learner -> {
            int xpAwarded = request == null ? 0 : safeInt(request.xpAwarded());
            int goldAwarded = request == null ? 0 : safeInt(request.goldAwarded());
            int updatedXp = clampToIntRange(
                    (long) safeInt(learner.getTotal_xp()) + xpAwarded,
                    0,
                    Integer.MAX_VALUE
            );
            int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;
            int updatedGold = clampToIntRange(
                    (long) safeInt(learner.getGold()) + goldAwarded,
                    0,
                    Integer.MAX_VALUE
            );
            
            learner.setTotal_xp(updatedXp);
            learner.setLevel(updatedLevel);
            learner.setGold(updatedGold);
            learner.setUpdated_at(LocalDateTime.now());
            learnerRepository.save(learner);
            leaderboardService.upsertLearnerScore(learner);
            if (xpAwarded > 0) {
                learnerXpRepository.save(LearnerXp.builder()
                        .learner(learner)
                        .xpDelta(xpAwarded)
                        .xpBefore(updatedXp - xpAwarded)
                        .xpAfter(updatedXp)
                        .sourceType("internal_award")
                        .occurredAt(OffsetDateTime.now())
                        .createdAt(OffsetDateTime.now())
                        .build());
            }

            return ResponseEntity.ok(Map.<String, Object>of(
                "learnerId", learner.getLearnerId(),
                "totalXp", learner.getTotal_xp(),
                "level", learner.getLevel(),
                "gold", learner.getGold()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ----- Progress Service mock-endpoints -----
    public record ProgressCheckRequestDto(UUID learnerId, List<UUID> contentIds) {}
    public record ContentCompletionBatchRequestDto(UUID learnerId, List<UUID> contentIds) {}

    @PostMapping("/progress/check-completed")
    public ResponseEntity<Boolean> checkAllCompleted(@RequestBody ProgressCheckRequestDto request) {
        if (request.contentIds() == null || request.contentIds().isEmpty()) {
            return ResponseEntity.ok(false);
        }
        long completed = learnerLessonProgressRepository.countByLearnerLearnerIdAndContentIdInAndStatus(
            request.learnerId(),
            request.contentIds(),
            LearnerLessonProgress.Status.COMPLETED
        );
        return ResponseEntity.ok(completed >= request.contentIds().size());
    }

    @GetMapping("/progress/npc-completed")
    public ResponseEntity<Boolean> isNpcCompleted(@RequestParam UUID learnerId, @RequestParam UUID npcId) {
        boolean completed = learnerLessonProgressRepository.existsByLearnerLearnerIdAndNpcIdAndStatus(
            learnerId,
            npcId,
            LearnerLessonProgress.Status.COMPLETED
        );
        return ResponseEntity.ok(completed);
    }

    @GetMapping("/progress/content-completed")
    public ResponseEntity<Boolean> isContentCompleted(@RequestParam UUID learnerId, @RequestParam UUID contentId) {
        boolean completed = learnerLessonProgressRepository.existsByLearnerLearnerIdAndContentIdAndStatus(
            learnerId,
            contentId,
            LearnerLessonProgress.Status.COMPLETED
        );
        return ResponseEntity.ok(completed);
    }

    @PostMapping("/progress/content-completed/batch")
    public ResponseEntity<List<UUID>> getCompletedContentIds(@RequestBody ContentCompletionBatchRequestDto request) {
        if (request == null || request.learnerId() == null || request.contentIds() == null || request.contentIds().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<UUID> completedContentIds = learnerLessonProgressRepository.findCompletedContentIdsByLearnerAndContentIds(
            request.learnerId(),
            request.contentIds(),
            LearnerLessonProgress.Status.COMPLETED
        );

        return ResponseEntity.ok(completedContentIds);
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private int clampToIntRange(long value, int min, int max) {
        if (value < min) return min;
        if (value > max) return max;
        return (int) value;
    }
}
