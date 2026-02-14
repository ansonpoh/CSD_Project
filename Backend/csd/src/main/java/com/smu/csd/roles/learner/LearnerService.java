package com.smu.csd.roles.learner;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
@Service
public class LearnerService {
    private final LearnerRepository repository;

    public LearnerService(LearnerRepository repository) {
        this.repository = repository;
    }

    public List<Learner> getAllLearners() {
        return repository.findAll();
    }

    public Optional<Learner> getLearnerById(UUID learner_id) {
        return repository.findById(learner_id);
    }

    public Optional<Learner> getBySupabaseUserId(UUID supabaseUserId) {
        return repository.findBySupabaseUserId(supabaseUserId);
    }

    public Learner saveLearner(Learner learner) {
        return repository.save(learner);
    }

    public Learner updateLearner(UUID learner_id, Learner learner) {
        return repository.findById(learner_id).map(current -> {
            current.setUsername(learner.getUsername());
            current.setEmail(learner.getEmail());
            current.setFull_name(learner.getFull_name());
            current.setTotal_xp(learner.getTotal_xp());
            current.setLevel(learner.getLevel());
            current.setUpdated_at(LocalDateTime.now());
            return repository.save(current);
        }).orElseThrow(() -> new RuntimeException("Learner not found."));
    }

    public void deleteLearner(UUID learner_id) {
        repository.deleteById(learner_id);
    }
}
