package com.smu.csd.achievements;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@Service
public class AchievementService {
    private static final String DEFAULT_SOURCE_SERVICE = "player-service";

    private final AchievementRepository achievementRepository;
    private final LearnerAchievementRepository learnerAchievementRepository;
    private final AchievementEventRepository achievementEventRepository;
    private final LearnerRepository learnerRepository;
    private final LeaderboardService leaderboardService;

    public AchievementService(
        AchievementRepository achievementRepository,
        LearnerAchievementRepository learnerAchievementRepository,
        AchievementEventRepository achievementEventRepository,
        LearnerRepository learnerRepository,
        LeaderboardService leaderboardService
    ) {
        this.achievementRepository = achievementRepository;
        this.learnerAchievementRepository = learnerAchievementRepository;
        this.achievementEventRepository = achievementEventRepository;
        this.learnerRepository = learnerRepository;
        this.leaderboardService = leaderboardService;
    }

    @Transactional(readOnly = true)
    public List<AchievementProgressResponse> getMyAchievements(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) {
            throw new IllegalArgumentException("Learner profile not found for current user.");
        }

        List<Achievement> active = achievementRepository.findByIsActiveTrueOrderByCreatedAtAsc();
        Map<UUID, LearnerAchievement> progressByAchievementId = new HashMap<>();
        for (LearnerAchievement progress : learnerAchievementRepository.findByLearnerLearnerId(learner.getLearnerId())) {
            if (progress.getAchievement() != null && progress.getAchievement().getAchievementId() != null) {
                progressByAchievementId.put(progress.getAchievement().getAchievementId(), progress);
            }
        }

        return active.stream()
            .map(achievement -> toResponse(achievement, progressByAchievementId.get(achievement.getAchievementId())))
            .toList();
    }

    @Transactional
    public void recordEvent(
        UUID learnerId,
        String eventType,
        Integer eventValue,
        String sourceService,
        String idempotencyKey,
        Map<String, Object> payload
    ) {
        if (learnerId == null || eventType == null || eventType.isBlank()) {
            return;
        }

        String normalizedIdempotency = normalizeText(idempotencyKey);
        if (normalizedIdempotency != null && achievementEventRepository.existsByIdempotencyKey(normalizedIdempotency)) {
            return;
        }

        Learner learner = learnerRepository.findById(learnerId).orElse(null);
        if (learner == null) {
            return;
        }

        String normalizedEventType = eventType.trim();
        int normalizedValue = Math.max(1, eventValue == null ? 1 : eventValue);
        String normalizedSourceService = normalizeText(sourceService);
        LocalDateTime now = LocalDateTime.now();

        achievementEventRepository.save(AchievementEvent.builder()
            .learner(learner)
            .eventType(normalizedEventType)
            .eventValue(normalizedValue)
            .sourceService(normalizedSourceService == null ? DEFAULT_SOURCE_SERVICE : normalizedSourceService)
            .idempotencyKey(normalizedIdempotency)
            .payloadJson(payload)
            .occurredAt(now)
            .build());

        List<Achievement> matchingAchievements = achievementRepository.findByEventTypeAndIsActiveTrue(normalizedEventType);
        if (matchingAchievements.isEmpty()) {
            return;
        }

        for (Achievement achievement : matchingAchievements) {
            LearnerAchievement learnerAchievement = findLatestLearnerAchievement(learnerId, achievement.getAchievementId());
            if (learnerAchievement == null) {
                learnerAchievement = LearnerAchievement.builder()
                    .learner(learner)
                    .achievement(achievement)
                    .progressValue(0)
                    .isUnlocked(false)
                    .isRewardClaimed(false)
                    .rewardClaimedAt(null)
                    .build();
            }

            boolean wasUnlocked = Boolean.TRUE.equals(learnerAchievement.getIsUnlocked());
            int currentProgress = safeInt(learnerAchievement.getProgressValue());
            int nextProgress = calculateProgress(
                currentProgress,
                normalizedValue,
                achievement.getProgressType(),
                safeTarget(achievement.getTargetValue())
            );

            learnerAchievement.setProgressValue(nextProgress);
            learnerAchievement.setLastEventAt(now);
            learnerAchievement.setUpdatedAt(now);
            if (!Boolean.TRUE.equals(learnerAchievement.getIsUnlocked())
                && Boolean.TRUE.equals(learnerAchievement.getIsRewardClaimed())) {
                learnerAchievement.setIsRewardClaimed(false);
                learnerAchievement.setRewardClaimedAt(null);
            }

            if (!wasUnlocked && nextProgress >= safeTarget(achievement.getTargetValue())) {
                learnerAchievement.setIsUnlocked(true);
                learnerAchievement.setUnlockedAt(now);
                learnerAchievement.setIsRewardClaimed(false);
                learnerAchievement.setRewardClaimedAt(null);
            }

            learnerAchievementRepository.save(learnerAchievement);
        }
    }

    @Transactional
    public void recordEventForSupabaseUser(
        UUID supabaseUserId,
        String eventType,
        Integer eventValue,
        String sourceService,
        String idempotencyKey,
        Map<String, Object> payload
    ) {
        if (supabaseUserId == null) {
            return;
        }
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) {
            return;
        }
        recordEvent(
            learner.getLearnerId(),
            eventType,
            eventValue,
            sourceService,
            idempotencyKey,
            payload
        );
    }

    @Transactional
    public AchievementProgressResponse claimAchievementForSupabaseUser(UUID supabaseUserId, UUID achievementId) {
        if (supabaseUserId == null || achievementId == null) {
            throw new IllegalArgumentException("Achievement claim request is invalid.");
        }

        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) {
            throw new IllegalArgumentException("Learner profile not found for current user.");
        }

        Achievement achievement = achievementRepository
            .findByAchievementIdAndIsActiveTrue(achievementId)
            .orElseThrow(() -> new IllegalArgumentException("Achievement not found or inactive."));

        LearnerAchievement learnerAchievement = findLatestLearnerAchievement(learner.getLearnerId(), achievementId);
        if (learnerAchievement == null) {
            throw new IllegalStateException("Achievement is not unlocked yet.");
        }

        if (!Boolean.TRUE.equals(learnerAchievement.getIsUnlocked())) {
            throw new IllegalStateException("Achievement is not unlocked yet.");
        }

        if (Boolean.TRUE.equals(learnerAchievement.getIsRewardClaimed())) {
            return toResponse(achievement, learnerAchievement);
        }

        LocalDateTime now = LocalDateTime.now();
        applyClaimRewards(learner, achievement, learnerAchievement, now);
        learnerAchievement.setUpdatedAt(now);

        learnerAchievementRepository.save(learnerAchievement);
        learnerRepository.save(learner);
        leaderboardService.upsertLearnerScore(learner);
        return toResponse(achievement, learnerAchievement);
    }

    private AchievementProgressResponse toResponse(Achievement achievement, LearnerAchievement progress) {
        return new AchievementProgressResponse(
            achievement.getAchievementId(),
            achievement.getName(),
            achievement.getDescription(),
            achievement.getCategory(),
            achievement.getEventType(),
            achievement.getProgressType(),
            achievement.getTargetValue(),
            achievement.getRewardXp(),
            achievement.getRewardGold(),
            achievement.getIsHidden(),
            achievement.getIsActive(),
            progress == null ? 0 : safeInt(progress.getProgressValue()),
            progress != null && Boolean.TRUE.equals(progress.getIsUnlocked()),
            progress == null ? null : progress.getUnlockedAt(),
            progress != null && Boolean.TRUE.equals(progress.getIsRewardClaimed()),
            progress == null ? null : progress.getRewardClaimedAt(),
            progress == null ? null : progress.getLastEventAt()
        );
    }

    private void applyClaimRewards(
        Learner learner,
        Achievement achievement,
        LearnerAchievement learnerAchievement,
        LocalDateTime now
    ) {
        int rewardXp = Math.max(0, safeInt(achievement.getRewardXp()));
        int rewardGold = Math.max(0, safeInt(achievement.getRewardGold()));

        int currentXp = safeInt(learner.getTotal_xp());
        int currentGold = safeInt(learner.getGold());
        int updatedXp = currentXp + rewardXp;
        int updatedGold = currentGold + rewardGold;
        int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;

        learner.setTotal_xp(updatedXp);
        learner.setGold(updatedGold);
        learner.setLevel(updatedLevel);
        learner.setUpdated_at(now);

        learnerAchievement.setIsRewardClaimed(true);
        learnerAchievement.setRewardClaimedAt(now);
    }

    private int calculateProgress(int current, int increment, String progressType, int target) {
        String normalizedType = progressType == null ? "COUNTER" : progressType.trim().toUpperCase();
        if ("BOOLEAN".equals(normalizedType)) {
            return Math.max(current, target);
        }

        long sum = (long) current + increment;
        if (sum > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        return (int) sum;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private int safeTarget(Integer value) {
        return Math.max(1, safeInt(value));
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private LearnerAchievement findLatestLearnerAchievement(UUID learnerId, UUID achievementId) {
        List<LearnerAchievement> rows = learnerAchievementRepository
            .findAllByLearnerLearnerIdAndAchievementAchievementIdOrderByUpdatedAtDesc(learnerId, achievementId);
        if (rows.isEmpty()) {
            return null;
        }
        return rows.get(0);
    }
}
