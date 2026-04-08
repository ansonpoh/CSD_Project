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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.access.prepost.PreAuthorize;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrator> addAdministrator(@Valid @RequestBody CreateAdminRequest request)
            throws ResourceAlreadyExistsException {
        Administrator administrator = Administrator.builder()
                .supabaseUserId(request.supabaseUserId())
                .email(request.email())
                .fullName(request.fullName())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(service.saveAdministrator(administrator));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Administrator>> getAllAdministrators(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size
    ) {
        return ResponseEntity.ok(service.getAllAdministrators(page, size));
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
            @Valid @RequestBody UpdateAdminRequest request) throws ResourceNotFoundException {
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
    public record CreateAdminRequest(
            @NotNull UUID supabaseUserId,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 120) String fullName
    ) {}

    public record UpdateAdminRequest(
            @Size(max = 120) String fullName,
            Boolean isActive
    ) {}
}
