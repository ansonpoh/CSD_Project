package com.smu.gateway.fallback;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/game")
    public Mono<ResponseEntity<Map<String, Object>>> gameServiceFallback() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", 503);
        response.put("message", "Game Service is currently unavailable. Please try again later.");
        response.put("service", "game-service");
        
        return Mono.just(ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(response));
    }
}
