package com.smu.gateway.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

public class RateLimiterConfigUnitTest {

    private final RateLimiterConfig config = new RateLimiterConfig();

    @Test
    void userKeyResolver_UsesAuthorizationHeaderWhenPresent() {
        KeyResolver resolver = config.userKeyResolver();
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/test")
                        .header("Authorization", "Bearer abc.def.ghi")
                        .build()
        );

        String key = resolver.resolve(exchange).block();

        assertEquals("Bearer abc.def.ghi", key);
    }

    @Test
    void userKeyResolver_FallsBackToAnonymousWhenHeaderMissing() {
        KeyResolver resolver = config.userKeyResolver();
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/test").build()
        );

        String key = resolver.resolve(exchange).block();

        assertEquals("anonymous", key);
    }
}
