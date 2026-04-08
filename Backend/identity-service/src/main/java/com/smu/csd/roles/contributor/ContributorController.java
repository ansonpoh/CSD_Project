package com.smu.csd.roles.contributor;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/contributors")
public class ContributorController {
    private final ContributorService service;

    public ContributorController(ContributorService service) {
        this.service = service;
    }

    // creates a new contributor when a client sends a POST request 
    @PostMapping("/add")
    @PreAuthorize("hasRole('LEARNER') or hasRole('ADMIN')")
    public ResponseEntity<Contributor> createContributor(Authentication authentication, @Valid @RequestBody CreateContributorRequest request)
            throws ResourceAlreadyExistsException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());

        Contributor contributor = service.createContributor(
                supabaseUserId,
                request.email(),
                request.fullName(),
                request.bio()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(contributor);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Contributor>> getAllContributors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size
    ) {
        return ResponseEntity.ok(service.getAllContributors(page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Contributor> getById(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/supabase/{supabaseUserId}")
    @PreAuthorize("hasRole('ADMIN') or #supabaseUserId.toString() == authentication.name")
    public ResponseEntity<Contributor> getBySupabaseUserId(@PathVariable UUID supabaseUserId)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getBySupabaseUserId(supabaseUserId));
    }

    @GetMapping("/check/{supabaseUserId}")
    @PreAuthorize("hasRole('ADMIN') or #supabaseUserId.toString() == authentication.name")
    public ResponseEntity<Boolean> isContributor(@PathVariable UUID supabaseUserId) {
        return ResponseEntity.ok(service.isContributor(supabaseUserId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Contributor> updateContributor(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateContributorRequest request) throws ResourceNotFoundException {
        Contributor contributor = service.updateContributor(
                id, request.fullName(), request.bio(), request.isActive()
        );
        return ResponseEntity.ok(contributor);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteContributor(@PathVariable UUID id) throws ResourceNotFoundException {
        service.deleteContributor(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Contributor> deactivateContributor(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.deactivateContributor(id));
    }

    public record CreateContributorRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 4000) String bio
    ) {}

    public record UpdateContributorRequest(
            @Size(max = 120) String fullName,
            @Size(max = 4000) String bio,
            Boolean isActive
    ) {}
}
