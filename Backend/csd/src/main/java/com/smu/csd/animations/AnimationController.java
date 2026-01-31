package com.smu.csd.animations;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/animations")
public class AnimationController {
    
    private final AnimationService service;

    public AnimationController(AnimationService service) {
        this.service = service;
    }

    @GetMapping
    public Optional<Animation> getAnimation(@RequestParam UUID animation_id) {
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
    
    

}
