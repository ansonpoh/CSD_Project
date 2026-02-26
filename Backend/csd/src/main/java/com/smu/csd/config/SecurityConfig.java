package com.smu.csd.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.smu.csd.security.AppJwtAuthenticationConverter;

import lombok.AllArgsConstructor;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@AllArgsConstructor
public class SecurityConfig {
    private final AppJwtAuthenticationConverter jwtAuthenticationConverter;

    /**
     * Defines which endpoints are public, which need authentication, and which need specific roles.
     * Uses Spring's OAuth2 resource server for JWT validation (handles ES256 via Supabase JWKS).
     * AppJwtAuthenticationConverter does the DB role lookup to assign ROLE_ADMIN/CONTRIBUTOR/LEARNER.
     */
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .authorizeHttpRequests(auth -> auth
                // Public endpoints (no authentication required)
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/health").permitAll()

                // For swagger documentation purposes.
                .requestMatchers("/swagger-ui").permitAll()
                .requestMatchers("/swagger-ui/**").permitAll()
                .requestMatchers("/swagger-ui.html").permitAll()
                .requestMatchers("/v3/api-docs/**").permitAll()
                .requestMatchers("/webjars/**").permitAll()

                // Self-registration endpoints — open so new users can create their own profile
                .requestMatchers(HttpMethod.POST, "/api/learner/add").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/contributors/add").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/administrators/add").permitAll()

                // Admin endpoints - requires ROLE_ADMIN
                .requestMatchers("/api/administrators/**").hasRole("ADMIN")

                // Contributor endpoints - requires ROLE_CONTRIBUTOR or ROLE_ADMIN
                .requestMatchers("/api/contributors/**").hasAnyRole("CONTRIBUTOR", "ADMIN")

                // All other requests require authentication (no unauthenticated access)
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
            )
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}