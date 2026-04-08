package com.smu.csd.learner;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.learner_profile.LearnerProfileState;
import com.smu.csd.learner_profile.LearnerProfileStateRepository;
import com.smu.csd.learner_progress.LearnerLessonProgressRepository;

@Service
public class LearnerService {
    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 500;

    private final LearnerRepository repository;
    private final LeaderboardService leaderboardService;

    @Autowired
    private LearnerProfileStateRepository profileStateRepository;

    @Autowired
    private LearnerLessonProgressRepository lessonProgressRepository;

    @Autowired
    private LearnerXpRepository learnerXpRepository;

    @Autowired
    private RestTemplate restTemplate;

    public LearnerService(LearnerRepository repository, LeaderboardService leaderboardService) {
        this.repository = repository;
        this.leaderboardService = leaderboardService;
    }

    @Transactional
    public Learner createLearner(UUID supabaseUserId, String username, String email, String fullName)
            throws ResourceAlreadyExistsException {
        if (repository.existsByUsernameIgnoreCase(username)) {
            throw new ResourceAlreadyExistsException("Username is already in use.");
        }

        if (repository.existsByEmail(email)) {
            throw new ResourceAlreadyExistsException("Learner", "email", email);
        }

        if (repository.existsBySupabaseUserId(supabaseUserId)) {
            throw new ResourceAlreadyExistsException("Learner profile already exists for this user");
        }

        Learner learner = Learner.builder()
                .supabaseUserId(supabaseUserId)
                .username(username)
                .email(email)
                .full_name(fullName)
                .level(1)
                .total_xp(0)
                .gold(0)
                .build();
        
        Learner saved = repository.save(learner);
        leaderboardService.upsertLearnerScore(saved);
        return saved;
    }

    public List<Learner> getAllLearners() {
        return getAllLearners(0, DEFAULT_PAGE_SIZE);
    }

    public List<Learner> getAllLearners(int page, int size) {
        return repository.findByIs_activeTrue(
                PageRequest.of(
                    normalizePage(page),
                    normalizeSize(size),
                    Sort.by(Sort.Direction.ASC, "learnerId")
                )
        ).getContent();
    }

    public Learner getById(UUID id) throws ResourceNotFoundException {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Learner", "id", id));
    }

    public Learner getBySupabaseUserId(UUID supabaseUserId) throws ResourceNotFoundException {
        Learner learner = repository.findBySupabaseUserId(supabaseUserId);
        if (learner == null || !Boolean.TRUE.equals(learner.getIs_active())) {
            throw new ResourceNotFoundException("Learner", "supabaseUserId", supabaseUserId);
        }
        return learner;
    }

    @Transactional
    public Learner awardXpAndGoldBySupabaseUserId(UUID supabaseUserId, Integer xpAwarded, Integer goldAwarded)
            throws ResourceNotFoundException {
        Learner learner = getBySupabaseUserId(supabaseUserId);

        int updatedXp = clampToIntRange(
                (long) safeInt(learner.getTotal_xp()) + safeInt(xpAwarded),
                0,
                Integer.MAX_VALUE
        );
        int updatedGold = clampToIntRange(
                (long) safeInt(learner.getGold()) + safeInt(goldAwarded),
                0,
                Integer.MAX_VALUE
        );
        int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;

        learner.setTotal_xp(updatedXp);
        learner.setGold(updatedGold);
        learner.setLevel(updatedLevel);
        learner.setUpdated_at(LocalDateTime.now());

        Learner updated = repository.save(learner);
        leaderboardService.upsertLearnerScore(updated);

        if (xpAwarded != null && xpAwarded > 0) {
            learnerXpRepository.save(LearnerXp.builder()
                    .learner(learner)
                    .xpDelta(xpAwarded)
                    .xpBefore(updatedXp - xpAwarded)
                    .xpAfter(updatedXp)
                    .sourceType("manual_award")
                    .occurredAt(OffsetDateTime.now())
                    .createdAt(OffsetDateTime.now())
                    .build());
        }

        return updated;
    }

    public boolean existsBySupabaseUserId(UUID supabaseUserId) {
        return repository.existsBySupabaseUserIdAndIs_activeTrue(supabaseUserId);
    }

    @Transactional
    public Learner updateLearner(UUID id, String username, String fullName, Integer totalXp, Integer level, Integer gold, Boolean isActive)
            throws ResourceNotFoundException {
        Learner learner = getById(id);

        if (username != null) learner.setUsername(username);
        if (fullName != null) learner.setFull_name(fullName);
        if (totalXp != null) learner.setTotal_xp(totalXp);
        if (level != null) learner.setLevel(level);
        if (gold != null) learner.setGold(gold);
        if (isActive != null) learner.setIs_active(isActive);
        learner.setUpdated_at(LocalDateTime.now());

        Learner updated = repository.save(learner);
        leaderboardService.upsertLearnerScore(updated);
        return updated;
    }

    @Transactional
    public void deleteLearner(UUID id) throws ResourceNotFoundException {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Learner", "id", id);
        }
        repository.deleteById(id);
        leaderboardService.removeLearner(id);
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private int clampToIntRange(long value, int min, int max) {
        if (value < min) return min;
        if (value > max) return max;
        return (int) value;
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    public LearnerAnalyticsResponse getLearnerAnalytics(UUID learnerId) throws ResourceNotFoundException {
        LearnerAnalyticsResponse response = new LearnerAnalyticsResponse();

        Learner learner = getById(learnerId);
        int level = learner.getLevel() != null ? learner.getLevel() : 1;
        int totalXp = learner.getTotal_xp() != null ? learner.getTotal_xp() : 0;

        int xpForCurrentLevel = (int) Math.pow(level - 1, 2) * 100;
        int xpForNextLevel = (int) Math.pow(level, 2) * 100;

        response.setCurrentLevel(level);
        response.setCurrentExp(Math.max(0, totalXp - xpForCurrentLevel));
        response.setExpToNextLevel(Math.max(1, xpForNextLevel - xpForCurrentLevel));

        try {
            LearnerProfileState profile = profileStateRepository.findById(learnerId).orElse(null);
            if (profile != null) {
                int streak = profile.getLearningStreak() != null ? profile.getLearningStreak() : 0;
                response.setCurrentStreak(streak);
                response.setLongestStreak(streak);
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not load profile streaks: " + e.getMessage());
        }

        try {
            List<Object[]> topicStats = lessonProgressRepository.countTopicProgressByStatus(learnerId);
            if (topicStats != null) {
                for (Object[] stat : topicStats) {
                    if (stat == null || stat[0] == null || stat[1] == null) continue;
                    
                    String status = stat[0].toString();
                    int count = ((Number) stat[1]).intValue();
                    
                    if ("COMPLETED".equals(status)) response.setTopicsCompleted(count);
                    else if ("IN_PROGRESS".equals(status)) response.setTopicsInProgress(count);
                    else if ("NOT_STARTED".equals(status)) response.setTopicsNotStarted(count);
                }
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not load topic stats: " + e.getMessage());
        }

        try {
            String url = "http://learning-service/api/internal/learning/analytics/" + learnerId.toString();
            LearnerAnalyticsResponse remoteStats = restTemplate.getForObject(url, LearnerAnalyticsResponse.class);

            if (remoteStats != null) {
                response.setQuizzesAttempted(remoteStats.getQuizzesAttempted());
                response.setAverageQuizScore(remoteStats.getAverageQuizScore());
                response.setBossCompletions(remoteStats.getBossCompletions());
            }
        } catch (Exception e) {
            System.err.println("Warning: Failed to fetch remote analytics from learning-service");
        }

        try {
            Instant since = LocalDate.now().minusDays(6).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
            Long total7d = learnerXpRepository.sumXpDeltaSince(learnerId, OffsetDateTime.ofInstant(since, java.time.ZoneOffset.UTC));
            response.setExpGainedLast7Days(total7d == null ? 0 : Math.max(0, total7d.intValue()));

            List<Object[]> rows = learnerXpRepository.sumXpDeltaByDaySince(learnerId, since);
            Map<LocalDate, Integer> last7DaysExp = new LinkedHashMap<>();
            LocalDate today = LocalDate.now();
            for (int i = 6; i >= 0; i--) {
                last7DaysExp.put(today.minusDays(i), 0);
            }

            for (Object[] row : rows) {
                if (row == null || row.length < 2 || row[0] == null || row[1] == null) continue;
                LocalDate day = null;
                if (row[0] instanceof java.sql.Date d) {
                    day = d.toLocalDate();
                } else if (row[0] instanceof LocalDate ld) {
                    day = ld;
                } else {
                    try {
                        day = LocalDate.parse(row[0].toString());
                    } catch (Exception ignored) {
                        day = null;
                    }
                }
                if (day == null || !last7DaysExp.containsKey(day)) continue;
                int gained = ((Number) row[1]).intValue();
                last7DaysExp.put(day, Math.max(0, gained));
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd");
            List<LearnerAnalyticsResponse.ExpHistoryEntry> graphData = new ArrayList<>();
            for (Map.Entry<LocalDate, Integer> entry : last7DaysExp.entrySet()) {
                graphData.add(new LearnerAnalyticsResponse.ExpHistoryEntry(entry.getKey().format(formatter), entry.getValue()));
            }
            response.setExpHistory(graphData);
        } catch (Exception e) {
            System.err.println("Warning: Could not build EXP graph: " + e.getMessage());
            response.setExpGainedLast7Days(0);
            response.setExpHistory(List.of());
        }

        return response;
    }
}
