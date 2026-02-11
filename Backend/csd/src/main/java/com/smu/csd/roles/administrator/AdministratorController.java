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

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/administrators")
public class AdministratorController {
    private final AdministratorService service;

    // Constructor injection - Spring passes the service automatically
    public AdministratorController(AdministratorService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Administrator> createAdministrator(@RequestBody CreateAdminRequest request) throws ResourceAlreadyExistsException {
        Administrator admin = service.createAdministrator(
                request.supabaseUserId(),
                request.email(),
                request.fullName()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(admin);
    }

    @GetMapping
    public ResponseEntity<List<Administrator>> getAllAdministrators() {
        return ResponseEntity.ok(service.getAllAdministrators());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Administrator> getById(@PathVariable String id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/supabase/{supabaseUserId}")
    public ResponseEntity<Administrator> getBySupabaseUserId(@PathVariable UUID supabaseUserId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getBySupabaseUserId(supabaseUserId));
    }

    @GetMapping("/check/{supabaseUserId}")
    public ResponseEntity<Boolean> isAdministrator(@PathVariable UUID supabaseUserId) {
        return ResponseEntity.ok(service.isAdministrator(supabaseUserId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Administrator> updateAdministrator(
            @PathVariable String id,
            @RequestBody UpdateAdminRequest request) throws ResourceNotFoundException {
        Administrator admin = service.updateAdministrator(id, request.fullName(), request.isActive());
        return ResponseEntity.ok(admin);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAdministrator(@PathVariable String id) throws ResourceNotFoundException {
        service.deleteAdministrator(id);
        return ResponseEntity.noContent().build();  // 204 No Content
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Administrator> deactivateAdministrator(@PathVariable String id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.deactivateAdministrator(id));
    }

    // Records: When frontend sends JSON like {"email": "x", "fullName": "y"}, Spring converts it to these objects.
    // We use records instead of Entity directly so frontend can only send the fields we allow (not id, createdAt, etc).
    // basically means that we only accept these fields
    public record CreateAdminRequest(UUID supabaseUserId, String email, String fullName) {}
    public record UpdateAdminRequest(String fullName, Boolean isActive) {}
}
