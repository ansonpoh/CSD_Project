package com.smu.csd.roles.learner_progress;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/learner/progress")
public class LearnerLessonProgressController {

    private final LearnerLessonProgressService service;

    public LearnerLessonProgressController(LearnerLessonProgressService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public List<LessonProgressResponse> getMyProgress(Authentication authentication) {
        UUID supabaseUserId = UUID.fromString(((Jwt) authentication.getPrincipal()).getSubject());
        return service.getMyProgress(supabaseUserId);
    }

    @PutMapping("/me/enroll")
    public LessonProgressResponse enroll(Authentication authentication, @Valid @RequestBody LessonProgressRequest req) {
        UUID supabaseUserId = UUID.fromString(((Jwt) authentication.getPrincipal()).getSubject());
        return service.enroll(supabaseUserId, req);
    }

    @PutMapping("/me/complete")
    public LessonProgressResponse complete(Authentication authentication, @Valid @RequestBody LessonProgressRequest req) {
        UUID supabaseUserId = UUID.fromString(((Jwt) authentication.getPrincipal()).getSubject());
        return service.complete(supabaseUserId, req);
    }
}
        