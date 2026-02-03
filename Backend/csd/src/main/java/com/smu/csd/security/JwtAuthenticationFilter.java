package com.smu.csd.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.smu.csd.roles.administrator.AdministratorRepository;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

// https://medium.com/@curteisyang/implementing-supabase-authentication-in-springboot-6eb5ddaabfc7

/**
 * JWT Authentication Filter - Intercepts every HTTP request to validate tokens.
 *
 * How it works:
 * 1. User logs in via Supabase → gets JWT with supabaseUserId
 * 2. User sends request with Bearer token
 * 3. Filter extracts supabaseUserId from token
 * 4. Filter checks Administrator table:
 *    - Found → ROLE_ADMIN
 *    - Not found → ROLE_USER (default)
 * 5. Spring Security context is set with the correct role
 */

@Component
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AdministratorRepository administratorRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // Skip if no Authorization header
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        String supabaseUserId;

        // Extract supabaseUserId from JWT token
        try {
            supabaseUserId = jwtService.extractPersonId(token);
        } catch (Exception e) {
            // Invalid token
            filterChain.doFilter(request, response);
            return;
        }

        // Validate token and set authentication
        if (supabaseUserId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.validateToken(token)) {
                UUID uuid = UUID.fromString(supabaseUserId);

                // Check database to determine role
                String role = determineRole(uuid);

                Map<String, String> principal = Map.of("supabaseUserId", supabaseUserId);

                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                    );

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Determine user role by checking which table they exist in.
     * Add more checks here as you add more role tables (e.g., CustomerRepository).
     */
    private String determineRole(UUID supabaseUserId) {
        if (administratorRepository.existsBySupabaseUserId(supabaseUserId)) {
            return "ADMIN";
        }
        // Add more role checks here:
        // if (customerRepository.existsBySupabaseUserId(supabaseUserId)) {
        //     return "CUSTOMER";
        // }
        return "USER";  // Default role for authenticated users not in any role table
    }
}