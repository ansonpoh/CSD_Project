package com.smu.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        // Rate limit based on the Authorization header (JWT)
        // If not present, fallback to "anonymous"
        return exchange -> Mono.just(
                exchange.getRequest().getHeaders().getFirst("Authorization") != null ?
                        exchange.getRequest().getHeaders().getFirst("Authorization") : "anonymous"
        );
    }
}
