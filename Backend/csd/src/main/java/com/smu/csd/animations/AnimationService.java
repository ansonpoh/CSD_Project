package com.smu.csd.animations;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class AnimationService {
    private final AnimationRepository repository;

    public AnimationService(AnimationRepository repository) {
        this.repository = repository;
    }

    //Get requests
    public List<Animation> getAllAnimations() {
        return repository.findAll();
    }

    public Optional<Animation> getAnimationById(UUID animation_id) {
        return repository.findById(animation_id);
    }

    //Post requests
    public Animation saveAnimation(Animation animation) {
        return repository.save(animation);
    }
}
