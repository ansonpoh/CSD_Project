package com.smu.csd.roles.learner_profile;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/learner/me/profile-state")
public class LearnerProfileStateController {
    private final LearnerProfileStateService service;

    public LearnerProfileStateController(LearnerProfileStateService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<LearnerProfileStateResponse> getMyProfileState(Authentication authentication) {
        return ResponseEntity.ok(service.getProfileState(getSupabaseUserId(authentication)));
    }

    @PutMapping("/avatar-preset")
    public ResponseEntity<LearnerProfileStateResponse> updateAvatarPreset(
        Authentication authentication,
        @RequestBody AvatarPresetRequest request
    ) {
        return ResponseEntity.ok(service.updateAvatarPreset(
            getSupabaseUserId(authentication),
            request == null ? null : request.avatarPreset()
        ));
    }

    @PostMapping("/daily-quests/events")
    public ResponseEntity<LearnerProfileStateResponse> recordDailyQuestEvent(
        Authentication authentication,
        @RequestBody DailyQuestEventRequest request
    ) {
        return ResponseEntity.ok(service.recordDailyQuestEvent(
            getSupabaseUserId(authentication),
            request == null ? null : request.eventType(),
            request == null ? null : request.amount()
        ));
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
