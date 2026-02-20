package com.smu.csd.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.NoArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.function.Function;

// https://medium.com/@curteisyang/implementing-supabase-authentication-in-springboot-6eb5ddaabfc7

@Service
@NoArgsConstructor
public class JwtService {

    @Value("${supabase.jwt.secret}")
    private String jwtSecret;

    @jakarta.annotation.PostConstruct
    public void init() {
        System.out.println("JwtService initialized with secret: " + (jwtSecret != null ? "LOADED" : "NULL"));
    }
    
    
    public String extractName(String token){
        return extractClaim(token, claims -> {
            HashMap<?, ?> userMetadata = claims.get("user_metadata", HashMap.class);
            if (userMetadata != null) {
                return userMetadata.get("name").toString();
            }
            return null;
        });
    }

    public String extractRole(String token){
        return extractClaim(token, claims -> {
            HashMap<?, ?> userMetadata = claims.get("user_metadata", HashMap.class);
            if (userMetadata != null) {
                return userMetadata.get("role").toString();
            }
            return null;
        });
    }
    
    public String extractPersonId(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims;
    }
    
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    public Boolean validateToken(String token) {
        try {
            boolean result = !isTokenExpired(token);
            return result;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    private Key getSignKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}