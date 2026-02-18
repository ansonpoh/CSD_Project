package com.smu.csd.economy.purchase;

import java.util.UUID;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseService service;

    public PurchaseController(PurchaseService service) {
        this.service = service;
    }

    @PostMapping("/me")
    public Purchase createMyPurchase(Authentication authentication, @Valid @RequestBody PurchaseRequest request) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        return service.createPurchase(supabaseUserId, request);
    }
}
