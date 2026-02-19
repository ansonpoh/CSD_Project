package com.smu.csd.roles.learner;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/learner")
public class LearnerController {
    private final LearnerService service;

    public LearnerController(LearnerService service) {
        this.service = service;
    }

    @GetMapping("/all")
    public ResponseEntity<List<Learner>> getAllLearners() {
        return ResponseEntity.ok(service.getAllLearners());
    }

    @GetMapping("/{learner_id}")
    public ResponseEntity<Learner> getLearnerById(@PathVariable UUID learner_id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(learner_id));
    }

    @GetMapping("/me")
    public ResponseEntity<Learner> getCurrentLearner(Authentication authentication) throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(service.getBySupabaseUserId(supabaseUserId));
    }

    @PostMapping("/add")
    public ResponseEntity<Learner> addLearner(@RequestBody Learner learner) throws ResourceAlreadyExistsException {
        Learner created = service.createLearner(
                learner.getSupabaseUserId(),
                learner.getUsername(),
                learner.getEmail(),
                learner.getFull_name()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{learner_id}")
    public ResponseEntity<Learner> updateLearner(@PathVariable UUID learner_id, @RequestBody Learner learner)
            throws ResourceNotFoundException {
        Learner updated = service.updateLearner(
                learner_id,
                learner.getUsername(),
                learner.getFull_name(),
                learner.getTotal_xp(),
                learner.getLevel(),
                learner.getIs_active()
        );
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{learner_id}")
    public ResponseEntity<Void> deleteLearner(@PathVariable UUID learner_id) throws ResourceNotFoundException {
        service.deleteLearner(learner_id);
        return ResponseEntity.noContent().build();
    }
}
