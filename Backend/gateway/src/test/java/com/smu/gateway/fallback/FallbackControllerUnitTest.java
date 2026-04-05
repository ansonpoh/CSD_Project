package com.smu.gateway.fallback;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

public class FallbackControllerUnitTest {

    private FallbackController controller;

    @BeforeEach
    public void setUp() {
        controller = new FallbackController();
    }

    @Test
    public void testGameServiceFallback() {
        Mono<ResponseEntity<Map<String, Object>>> responseMono = controller.gameServiceFallback();

        StepVerifier.create(responseMono)
                .assertNext(response -> {
                    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
                    assertNotNull(response.getBody());
                    assertEquals("game-service", response.getBody().get("service"));
                })
                .verifyComplete();
    }
}
