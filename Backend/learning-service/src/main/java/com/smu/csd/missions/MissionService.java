package com.smu.csd.missions;

import com.smu.csd.ai.AIService;
import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MissionService {

    private static final int MAX_DAILY_MISSIONS = 2;

    private final MissionRepository missionRepository;
    private final LearnerDailyMissionRepository dailyMissionRepository;
    private final MissionAttemptRepository attemptRepository;
    private final AIService aiService;
    private final RestTemplate restTemplate;

    @Value("${player.url:http://player-service:8084}")
    private String playerServiceUrl;

    // ── Admin: mission pool management ──────────────────────────────────────

    public Mission createMission(String title, String description, Mission.Type type,
                                 int rewardXp, int rewardGold) {
        return missionRepository.save(Mission.builder()
                .title(title)
                .description(description)
                .type(type)
                .rewardXp(rewardXp)
                .rewardGold(rewardGold)
                .build());
    }

    public List<Mission> getAllMissions() {
        return missionRepository.findAll();
    }

    public Mission setActive(UUID missionId, boolean active) throws ResourceNotFoundException {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mission", "missionId", missionId));
        mission.setActive(active);
        return missionRepository.save(mission);
    }

    public List<MissionAttempt> getFlaggedAttempts() {
        return attemptRepository.findByStatus(MissionAttempt.Status.FLAGGED_FOR_REVIEW);
    }

    @Transactional
    public MissionAttempt adminReview(UUID attemptId, boolean approve, String note) throws ResourceNotFoundException {
        MissionAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("MissionAttempt", "attemptId", attemptId));

        attempt.setStatus(approve ? MissionAttempt.Status.APPROVED : MissionAttempt.Status.REJECTED);
        attempt.setAiReviewNote(note);

        if (approve) {
            grantReward(attempt);
        }

        return attemptRepository.save(attempt);
    }

    // ── Learner: daily missions ──────────────────────────────────────────────

    /**
     * Returns today's active missions for the learner.
     * Tops up to MAX_DAILY_MISSIONS if under the limit and completions < MAX_DAILY_MISSIONS.
     */
    @Transactional
    public List<LearnerDailyMission> getDailyMissions(UUID learnerId) {
        LocalDate today = LocalDate.now();
        List<LearnerDailyMission> todaysMissions = dailyMissionRepository
                .findByLearnerIdAndAssignedDate(learnerId, today);

        long completed = todaysMissions.stream()
                .filter(m -> m.getStatus() == LearnerDailyMission.Status.COMPLETED)
                .count();
        long active = todaysMissions.stream()
                .filter(m -> m.getStatus() == LearnerDailyMission.Status.ACTIVE)
                .count();

        // Top up if under limit and daily cap not reached
        long canAssign = MAX_DAILY_MISSIONS - completed - active;
        if (canAssign > 0 && completed < MAX_DAILY_MISSIONS) {
            List<Mission> pool = missionRepository.findRandomActive((int) canAssign);
            for (Mission mission : pool) {
                dailyMissionRepository.save(LearnerDailyMission.builder()
                        .learnerId(learnerId)
                        .mission(mission)
                        .assignedDate(today)
                        .build());
            }
            todaysMissions = dailyMissionRepository.findByLearnerIdAndAssignedDate(learnerId, today);
        }

        return todaysMissions.stream()
                .filter(m -> m.getStatus() == LearnerDailyMission.Status.ACTIVE)
                .toList();
    }

    // ── Learner: submit reflection ───────────────────────────────────────────

    @Transactional
    public MissionAttempt submitReflection(UUID learnerId, UUID missionId, String reflection)
            throws ResourceNotFoundException {

        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mission", "missionId", missionId));

        // Save the attempt
        MissionAttempt attempt = attemptRepository.save(MissionAttempt.builder()
                .learnerId(learnerId)
                .mission(mission)
                .reflection(reflection)
                .build());

        // AI review
        AIService.ReflectionReviewResult review = aiService.reviewReflection(
                mission.getTitle(), mission.getDescription(), reflection);

        MissionAttempt.Status newStatus = switch (review.verdict()) {
            case "APPROVED" -> MissionAttempt.Status.APPROVED;
            case "REJECTED" -> MissionAttempt.Status.REJECTED;
            default -> MissionAttempt.Status.FLAGGED_FOR_REVIEW;
        };

        attempt.setStatus(newStatus);
        attempt.setAiReviewNote(review.note());

        if (newStatus == MissionAttempt.Status.APPROVED) {
            grantReward(attempt);
            markDailyMissionCompleted(learnerId, missionId);
        }

        return attemptRepository.save(attempt);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private void grantReward(MissionAttempt attempt) {
        if (attempt.isRewardClaimed()) return;

        try {
            LearnerDto learner = restTemplate.getForObject(
                    playerServiceUrl + "/api/internal/learners/supabase/" + attempt.getLearnerId(),
                    LearnerDto.class);
            if (learner == null) return;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = Map.of(
                    "xpAwarded", attempt.getMission().getRewardXp(),
                    "goldAwarded", attempt.getMission().getRewardGold());
            restTemplate.postForObject(
                    playerServiceUrl + "/api/internal/learners/" + learner.learnerId() + "/award-xp",
                    new HttpEntity<>(body, headers),
                    Map.class);

            attempt.setRewardClaimed(true);
        } catch (Exception e) {
            // Log and continue — reward can be retried by admin approval flow
        }
    }

    private void markDailyMissionCompleted(UUID learnerId, UUID missionId) {
        dailyMissionRepository
                .findByLearnerIdAndAssignedDate(learnerId, LocalDate.now())
                .stream()
                .filter(dm -> dm.getMission().getMissionId().equals(missionId)
                        && dm.getStatus() == LearnerDailyMission.Status.ACTIVE)
                .findFirst()
                .ifPresent(dm -> {
                    dm.setStatus(LearnerDailyMission.Status.COMPLETED);
                    dailyMissionRepository.save(dm);
                });
    }
}
