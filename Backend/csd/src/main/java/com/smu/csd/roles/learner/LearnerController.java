package com.smu.csd.roles.learner;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;;



@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/learner")
public class LearnerController {
    private final LearnerService service;

    public LearnerController(LearnerService service) {
        this.service = service;
    }

    @GetMapping("/{learner_id}")
    public Optional<Learner> getLearnerById(@PathVariable UUID learner_id) {
        return service.getLearnerById(learner_id);
    }

    @GetMapping("/all")
    public List<Learner> getAllLearners() {
        return service.getAllLearners();
    }

    @GetMapping("/me")
    public Learner getCurrentLearner(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        return service.getBySupabaseUserId(supabaseUserId);
    }

    @PostMapping("add")
    public Learner addLearner(@Valid @RequestBody Learner learner) {
        return service.saveLearner(learner);
    }

    @PutMapping("/{learner_id}")
    public Learner updateLearner(@PathVariable UUID learner_id, @Valid @RequestBody Learner learner) {
        return service.updateLearner(learner_id, learner);
    }

    @DeleteMapping("/{learner_id}")
    public void deleteLearner(@PathVariable UUID learner_id) {
        service.deleteLearner(learner_id);
    }
    
    
}
