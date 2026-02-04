package com.smu.csd.animations;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;



@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/animations")
public class AnimationController {
    
    private final AnimationService service;

    public AnimationController(AnimationService service) {
        this.service = service;
    }

    @GetMapping("/{animation_id}")
    public Optional<Animation> getAnimation(@PathVariable UUID animation_id) {
        return service.getAnimationById(animation_id);
    } 

    @GetMapping("/all")
    public List<Animation> getAllAnimations() {
        return service.getAllAnimations();
    }


    @PostMapping("/add")
    public Animation addAnimation(@Valid @RequestBody Animation animation) {
        return service.saveAnimation(animation);
    }

    
    @PutMapping("/{animation_id}")
    public Animation updateAnimation(@PathVariable UUID animation_id, @Valid @RequestBody Animation animation) {
        return service.updateAnimation(animation_id, animation);
    }


    @DeleteMapping("/{animation_id}")
    public void deleteAnimation(@PathVariable UUID animation_id) {
        service.deleteAnimation(animation_id);
    }

}
