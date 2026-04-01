package com.smu.csd.learner;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.leaderboard.LeaderboardService;

@Service
public class LearnerService {
    private final LearnerRepository repository;
    private final LeaderboardService leaderboardService;

    public LearnerService(LearnerRepository repository, LeaderboardService leaderboardService) {
        this.repository = repository;
        this.leaderboardService = leaderboardService;
    }

    @Transactional
    public Learner createLearner(UUID supabaseUserId, String username, String email, String fullName)
            throws ResourceAlreadyExistsException {
        if (repository.existsByEmail(email)) {
            throw new ResourceAlreadyExistsException("Email is already in use.");
        }

        if (repository.existsByUsernameIgnoreCase(username)) {
            throw new ResourceAlreadyExistsException("Username is already in use.");
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
        return repository.findAll();
    }

    public Learner getById(UUID id) throws ResourceNotFoundException {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Learner", "id", id));
    }

    public Learner getBySupabaseUserId(UUID supabaseUserId) throws ResourceNotFoundException {
        return repository.findBySupabaseUserId(supabaseUserId);
    }

    @Transactional
    public Learner awardXpAndGoldBySupabaseUserId(UUID supabaseUserId, Integer xpAwarded, Integer goldAwarded)
            throws ResourceNotFoundException {
        Learner learner = getBySupabaseUserId(supabaseUserId);
        if (learner == null) {
            throw new ResourceNotFoundException("Learner", "supabaseUserId", supabaseUserId);
        }

        int updatedXp = (learner.getTotal_xp() != null ? learner.getTotal_xp() : 0) + safeInt(xpAwarded);
        int updatedGold = (learner.getGold() != null ? learner.getGold() : 0) + safeInt(goldAwarded);
        int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;

        learner.setTotal_xp(updatedXp);
        learner.setGold(updatedGold);
        learner.setLevel(updatedLevel);
        learner.setUpdated_at(LocalDateTime.now());

        Learner updated = repository.save(learner);
        leaderboardService.upsertLearnerScore(updated);
        return updated;
    }

    public boolean existsBySupabaseUserId(UUID supabaseUserId) {
        return repository.existsBySupabaseUserId(supabaseUserId);
    }

    @Transactional
    public Learner updateLearner(UUID id, String username, String fullName, Integer totalXp, Integer level, Integer gold, Boolean isActive)
            throws ResourceNotFoundException {
        Learner learner = getById(id);

        if (username != null) {
            learner.setUsername(username);
        }
        if (fullName != null) {
            learner.setFull_name(fullName);
        }
        if (totalXp != null) {
            learner.setTotal_xp(totalXp);
        }
        if (level != null) {
            learner.setLevel(level);
        }
        if (gold != null) {
            learner.setGold(gold);
        }
        if (isActive != null) {
            learner.setIs_active(isActive);
        }
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
}
