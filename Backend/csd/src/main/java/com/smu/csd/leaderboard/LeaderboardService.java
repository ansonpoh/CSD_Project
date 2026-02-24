package com.smu.csd.leaderboard;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;

@Service
public class LeaderboardService {

    private static final String LEADERBOARD_KEY = "leaderboard:xp";
    private static final int MAX_LIMIT = 100;

    private final StringRedisTemplate redisTemplate;
    private final LearnerRepository learnerRepository;

    public LeaderboardService(StringRedisTemplate redisTemplate, LearnerRepository learnerRepository) {
        this.redisTemplate = redisTemplate;
        this.learnerRepository = learnerRepository;
    }

    public void upsertLearnerScore(Learner learner) {
        if (learner == null || learner.getLearnerId() == null) return;
        redisTemplate.opsForZSet().add(
                LEADERBOARD_KEY,
                learner.getLearnerId().toString(),
                normalizeXp(learner.getTotal_xp())
        );
    }

    public void removeLearner(UUID learnerId) {
        if (learnerId == null) return;
        redisTemplate.opsForZSet().remove(LEADERBOARD_KEY, learnerId.toString());
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getTop(int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));

        Set<ZSetOperations.TypedTuple<String>> tuples = redisTemplate.opsForZSet()
                .reverseRangeWithScores(LEADERBOARD_KEY, 0, limit - 1);

        if (tuples == null || tuples.isEmpty()) {
            return List.of();
        }

        List<UUID> orderedIds = new ArrayList<>();
        Map<UUID, Integer> xpById = new HashMap<>();

        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            if (tuple.getValue() == null) continue;
            UUID learnerId = UUID.fromString(tuple.getValue());
            int xp = tuple.getScore() == null ? 0 : (int) Math.round(tuple.getScore());
            orderedIds.add(learnerId);
            xpById.put(learnerId, xp);
        }

        Map<UUID, String> usernameById = learnerRepository.findAllById(orderedIds).stream()
                .collect(Collectors.toMap(Learner::getLearnerId, Learner::getUsername));

        List<LeaderboardEntryResponse> result = new ArrayList<>();
        for (UUID learnerId : orderedIds) {
            String username = usernameById.get(learnerId);
            if (username == null) continue;

            Long rank = redisTemplate.opsForZSet().reverseRank(LEADERBOARD_KEY, learnerId.toString());
            if (rank == null) continue;

            result.add(new LeaderboardEntryResponse(
                    learnerId,
                    username,
                    xpById.getOrDefault(learnerId, 0),
                    rank + 1
            ));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public LeaderboardMeResponse getRank(UUID learnerId) throws ResourceNotFoundException {
        Learner learner = learnerRepository.findById(learnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Learner", "id", learnerId));

        upsertLearnerScore(learner);

        Long rank = redisTemplate.opsForZSet().reverseRank(LEADERBOARD_KEY, learnerId.toString());
        if (rank == null) {
            throw new ResourceNotFoundException("Leaderboard", "learnerId", learnerId);
        }

        return new LeaderboardMeResponse(
                learner.getLearnerId(),
                learner.getUsername(),
                normalizeXp(learner.getTotal_xp()),
                rank + 1
        );
    }

    @Transactional(readOnly = true)
    public void rebuildFromDatabase() {
        redisTemplate.delete(LEADERBOARD_KEY);

        int page = 0;
        Page<Learner> learnerPage;
        do {
            learnerPage = learnerRepository.findAll(PageRequest.of(page, 500));
            for (Learner learner : learnerPage.getContent()) {
                upsertLearnerScore(learner);
            }
            page++;
        } while (learnerPage.hasNext());
    }

    private int normalizeXp(Integer xp) {
        if (xp == null) return 0;
        return Math.max(0, xp);
    }
}
