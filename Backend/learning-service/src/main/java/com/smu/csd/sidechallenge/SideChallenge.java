package com.smu.csd.sidechallenge;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "side_challenge")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SideChallenge {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Id
    @UuidGenerator
    @Column(name = "challenge_id")
    private UUID challengeId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    /** Map theme this challenge belongs to: forest, cave, mountain, garden */
    @Column(name = "map_theme", nullable = false, length = 64)
    private String mapTheme;

    /** Words in the correct order, stored as a JSON array string */
    @Column(name = "ordered_tokens", columnDefinition = "TEXT")
    @Builder.Default
    private String orderedTokensJson = "[]";

    @Column(name = "reward_xp", nullable = false)
    @Builder.Default
    private int rewardXp = 40;

    @Column(name = "reward_assist", nullable = false)
    @Builder.Default
    private int rewardAssist = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Transient
    public List<String> getOrderedTokens() {
        if (orderedTokensJson == null || orderedTokensJson.isBlank()) {
            return List.of();
        }
        try {
            List<String> tokens = MAPPER.readValue(orderedTokensJson, new TypeReference<>() {});
            return tokens == null ? List.of() : tokens;
        } catch (Exception e) {
            return List.of();
        }
    }

    public void setOrderedTokens(List<String> tokens) {
        try {
            this.orderedTokensJson = MAPPER.writeValueAsString(tokens == null ? List.of() : tokens);
        } catch (Exception e) {
            this.orderedTokensJson = "[]";
        }
    }

    @PrePersist
    @PreUpdate
    private void normalizeOrderedTokensJson() {
        if (orderedTokensJson == null || orderedTokensJson.isBlank()) {
            orderedTokensJson = "[]";
        }
    }
}
