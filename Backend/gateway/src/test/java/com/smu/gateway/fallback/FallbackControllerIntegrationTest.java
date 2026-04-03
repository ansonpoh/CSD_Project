package com.smu.gateway.fallback;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureWebTestClient
@ActiveProfiles("test")
public class FallbackControllerIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void fallbackGameEndpoint_ReturnsServiceUnavailablePayload() {
        webTestClient.get()
                .uri("/fallback/game")
                .exchange()
                .expectStatus().isEqualTo(503)
                .expectBody()
                .jsonPath("$.service").isEqualTo("game-service")
                .jsonPath("$.status").isEqualTo(503)
                .jsonPath("$.message").value(message -> ((String) message).contains("unavailable"));
    }
}
