package com.smu.csd.roles.administrator;

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

import org.springframework.security.access.prepost.PreAuthorize;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.learner.Learner;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/administrators")
public class AdministratorController {
    private final AdministratorService service;

    // Constructor injection - Spring passes the service automatically
    public AdministratorController(AdministratorService service) {
        this.service = service;
    }

    // @PostMapping
    // public ResponseEntity<Administrator> createAdministrator(@RequestBody CreateAdminRequest request) throws ResourceAlreadyExistsException {
    //     Administrator admin = service.createAdministrator(
    //             request.supabaseUserId(),
    //             request.email(),
    //             request.fullName()
    //     );
    //     return ResponseEntity.status(HttpStatus.CREATED).body(admin);
    // }
    @PostMapping("add")
    @PreAuthorize("hasRole('ADMIN')")
    public Administrator addAdministrator(@Valid @RequestBody Administrator administrator) {
        return service.saveAdministrator(administrator);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Administrator>> getAllAdministrators() {
        return ResponseEntity.ok(service.getAllAdministrators());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrator> getById(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/supabase/{supabaseUserId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrator> getBySupabaseUserId(@PathVariable UUID supabaseUserId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getBySupabaseUserId(supabaseUserId));
    }

    @GetMapping("/check/{supabaseUserId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Boolean> isAdministrator(@PathVariable UUID supabaseUserId) {
        return ResponseEntity.ok(service.isAdministrator(supabaseUserId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrator> updateAdministrator(
            @PathVariable UUID id,
            @RequestBody UpdateAdminRequest request) throws ResourceNotFoundException {
        Administrator admin = service.updateAdministrator(id, request.fullName(), request.isActive());
        return ResponseEntity.ok(admin);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAdministrator(@PathVariable UUID id) throws ResourceNotFoundException {
        service.deleteAdministrator(id);
        return ResponseEntity.noContent().build();  // 204 No Content
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrator> deactivateAdministrator(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.deactivateAdministrator(id));
    }

    // Records: When frontend sends JSON like {"email": "x", "fullName": "y"}, Spring converts it to these objects.
    // We use records instead of Entity directly so frontend can only send the fields we allow (not id, createdAt, etc).
    // basically means that we only accept these fields
    public record CreateAdminRequest(UUID supabaseUserId, String email, String fullName) {}
    public record UpdateAdminRequest(String fullName, Boolean isActive) {}
}
