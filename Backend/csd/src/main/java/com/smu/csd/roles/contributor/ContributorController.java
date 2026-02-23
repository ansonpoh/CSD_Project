package com.smu.csd.roles.contributor;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/contributors")
public class ContributorController {
    private final ContributorService service;

    public ContributorController(ContributorService service) {
        this.service = service;
    }

    // creates a new contributor when a client sends a POST request 
    @PostMapping("/add")
    public ResponseEntity<Contributor> createContributor(@RequestBody CreateContributorRequest request)
            throws ResourceAlreadyExistsException {
        Contributor contributor = service.createContributor(
                request.supabaseUserId(),
                request.email(),
                request.fullName(),
                request.bio()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(contributor);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Contributor>> getAllContributors() {
        return ResponseEntity.ok(service.getAllContributors());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Contributor> getById(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/supabase/{supabaseUserId}")
    public ResponseEntity<Contributor> getBySupabaseUserId(@PathVariable UUID supabaseUserId)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getBySupabaseUserId(supabaseUserId));
    }

    @GetMapping("/check/{supabaseUserId}")
    public ResponseEntity<Boolean> isContributor(@PathVariable UUID supabaseUserId) {
        return ResponseEntity.ok(service.isContributor(supabaseUserId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Contributor> updateContributor(
            @PathVariable UUID id,
            @RequestBody UpdateContributorRequest request) throws ResourceNotFoundException {
        Contributor contributor = service.updateContributor(
                id, request.fullName(), request.bio(), request.isActive()
        );
        return ResponseEntity.ok(contributor);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContributor(@PathVariable UUID id) throws ResourceNotFoundException {
        service.deleteContributor(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Contributor> deactivateContributor(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.deactivateContributor(id));
    }

    public record CreateContributorRequest(UUID supabaseUserId, String email, String fullName, String bio) {}
    public record UpdateContributorRequest(String fullName, String bio, Boolean isActive) {}
}
