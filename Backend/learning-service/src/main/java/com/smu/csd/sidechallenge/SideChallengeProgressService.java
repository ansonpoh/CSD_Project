package com.smu.csd.sidechallenge;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.LearnerDto;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SideChallengeProgressService {

    private final SideChallengeRepository sideChallengeRepository;
    private final SideChallengeProgressRepository progressRepository;
    private final RestTemplate restTemplate;

    @Value("${PLAYER_SERVICE_URL:http://player-service:8084}")
    private String playerServiceUrl;

    public SideChallengeProgressSnapshot getMyProgress(UUID supabaseUserId, UUID sideChallengeId) {
        UUID learnerId = requireLearnerId(supabaseUserId);
        return progressRepository.findProgress(learnerId, sideChallengeId)
                .map(row -> new SideChallengeProgressSnapshot(
                        Boolean.TRUE.equals(row.getCompleted()),
                        row.getAttempts() == null ? 0 : row.getAttempts(),
                        row.getLastResult()))
                .orElse(new SideChallengeProgressSnapshot(false, 0, null));
    }

    @Transactional
    public SideChallengeProgressSnapshot recordAttempt(UUID supabaseUserId, UUID sideChallengeId, boolean won) {
        UUID learnerId = requireLearnerId(supabaseUserId);
        if (!sideChallengeRepository.existsById(sideChallengeId)) {
            throw new IllegalArgumentException("Side challenge not found.");
        }

        int updated = progressRepository.updateAttempt(learnerId, sideChallengeId, won);
        if (updated == 0) {
            progressRepository.insertAttempt(learnerId, sideChallengeId, won);
        }

        return getMyProgress(supabaseUserId, sideChallengeId);
    }

    private UUID requireLearnerId(UUID supabaseUserId) {
        if (supabaseUserId == null) {
            throw new IllegalArgumentException("Missing authenticated user.");
        }
        try {
            String url = playerServiceUrl + "/api/internal/learners/supabase/" + supabaseUserId;
            LearnerDto learner = restTemplate.getForObject(url, LearnerDto.class);
            if (learner == null || learner.learnerId() == null) {
                throw new IllegalArgumentException("Learner profile not found.");
            }
            return learner.learnerId();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Learner profile not found.");
        }
    }
}
