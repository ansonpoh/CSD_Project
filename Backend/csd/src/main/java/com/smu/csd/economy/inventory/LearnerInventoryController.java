package com.smu.csd.economy.inventory;

import java.util.List;
import java.util.UUID;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/inventory")
public class LearnerInventoryController {
    private final LearnerInventoryService service;

    public LearnerInventoryController (LearnerInventoryService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public List<InventoryItemResponse> getMyInventory(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        return service.getMyInventory(supabaseUserId);
    }

    @PostMapping("/me/items")
    public List<InventoryItemResponse> addInventoryItem( Authentication authentication, @Valid @RequestBody InventoryRequest request) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        System.out.println(request);
        return service.addOrIncrement(supabaseUserId, request);
    }
    
}
