package com.smu.csd;

import java.time.LocalDateTime;
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
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;
import com.smu.csd.roles.learner_progress.LearnerLessonProgress;
import com.smu.csd.roles.learner_progress.LearnerLessonProgressRepository;

import lombok.RequiredArgsConstructor;

/**
 * Controller strictly for internal inter-service communication.
 * Providing Learner and Progress data to other services.
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalController {

    private final LearnerRepository learnerRepository;
    private final LearnerLessonProgressRepository learnerLessonProgressRepository;
    private final LeaderboardService leaderboardService;

    // ----- Learner Service mock-endpoints -----
    @GetMapping("/learners/supabase/{supabaseUserId}")
    public ResponseEntity<Map<String, Object>> getLearnerBySupabaseId(@PathVariable UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) return ResponseEntity.notFound().build();
        
        return ResponseEntity.ok(Map.of(
            "learnerId", learner.getLearnerId(),
            "totalXp", learner.getTotal_xp() != null ? learner.getTotal_xp() : 0,
            "level", learner.getLevel() != null ? learner.getLevel() : 1
        ));
    }

    public record AwardXpRequestDto(int xpAwarded) {}

    @PostMapping("/learners/{learnerId}/award-xp")
    public ResponseEntity<Map<String, Object>> awardXp(@PathVariable UUID learnerId, @RequestBody AwardXpRequestDto request) {
        return learnerRepository.findById(learnerId).map(learner -> {
            int updatedXp = (learner.getTotal_xp() != null ? learner.getTotal_xp() : 0) + request.xpAwarded();
            int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;
            
            learner.setTotal_xp(updatedXp);
            learner.setLevel(updatedLevel);
            learner.setUpdated_at(LocalDateTime.now());
            learnerRepository.save(learner);
            leaderboardService.upsertLearnerScore(learner);

            return ResponseEntity.ok(Map.<String, Object>of(
                "learnerId", learner.getLearnerId(),
                "totalXp", learner.getTotal_xp(),
                "level", learner.getLevel()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ----- Progress Service mock-endpoints -----
    public record ProgressCheckRequestDto(UUID learnerId, List<UUID> contentIds) {}

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
}
