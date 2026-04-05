package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.contents.flags.ContentFlag;
import com.smu.csd.contents.flags.ContentFlagService;
import com.smu.csd.contents.ratings.ContentRatingRequest;
import com.smu.csd.contents.ratings.ContentRatingResponse;
import com.smu.csd.contents.ratings.ContentRatingService;
import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/contents")
public class ContentController {

    private final ContentService service;
    private final ContentFlagService contentFlagService;
    private final ContentRatingService contentRatingService;

    public ContentController(
            ContentService service,
            ContentFlagService contentFlagService,
            ContentRatingService contentRatingService
    ) {
        this.service = service;
        this.contentFlagService = contentFlagService;
        this.contentRatingService = contentRatingService;
    }

    // Contributor submits content with their narration lines - triggers AI screening
    @PostMapping
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<Content> submitContent(
            @Valid @RequestBody SubmitContentRequest request,
            Authentication authentication
    )
            throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID contributorId = UUID.fromString(jwt.getSubject());

        Content content = service.submitContent(
                contributorId,
                request.topicId(),
                request.npcId(),
                request.mapId(),
                request.title(),
                request.description(),
                request.narrations(),
                request.videoUrl(),
                request.resubmittedFromId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(content);
    }

    // Moderator views the full review queue (all PENDING_REVIEW content)
    @GetMapping("/queue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Content>> getQueue() {
        return ResponseEntity.ok(service.getByStatus(Content.Status.PENDING_REVIEW));
    }

    // View a single content by ID
    @GetMapping("/{contentId}")
    public ResponseEntity<Content> getById(@PathVariable UUID contentId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(contentId));
    }

    // Contributor views all their own submissions
    @GetMapping("/contributor/{contributorId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CONTRIBUTOR') and #contributorId.toString() == authentication.principal.subject)")
    public ResponseEntity<List<Content>> getByContributor(@PathVariable UUID contributorId) {
        return ResponseEntity.ok(service.getByContributorId(contributorId));
    }

    // Browse all content under a topic
    @GetMapping("/topic/{topicId}")
    public ResponseEntity<List<Content>> getByTopic(@PathVariable UUID topicId)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getByTopic(topicId));
    }

    // Search content by title keyword
    @GetMapping("/search")
    public ResponseEntity<List<Content>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(service.searchByTitle(keyword));
    }

    // Lets admin look at moderation result of a specific content
    @GetMapping("/{contentId}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AIModerationResult> getModeration(@PathVariable UUID contentId)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getModerationResult(contentId));
    }

    // Moderator approves content that AI flagged as NEEDS_REVIEW
    @PutMapping("/{contentId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Content> approve(@PathVariable UUID contentId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.approveContent(contentId));
    }

    // Moderator rejects content that AI flagged as NEEDS_REVIEW
    @PutMapping("/{contentId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Content> reject(
            @PathVariable UUID contentId,
            @Valid @RequestBody RejectContentRequest request) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.rejectContent(contentId, request.rejectionReason(), request.adminComments()));
    }

    @GetMapping("/{contentId}/rating")
    public ResponseEntity<ContentRatingResponse> getRating(
            @PathVariable UUID contentId,
            Authentication authentication
    ) throws ResourceNotFoundException {
        UUID currentUser = authentication == null ? null : UUID.fromString(((Jwt) authentication.getPrincipal()).getSubject());
        return ResponseEntity.ok(contentRatingService.getRatingSummary(contentId, currentUser));
    }

    @PutMapping("/{contentId}/rating")
    @PreAuthorize("hasRole('LEARNER')")
    public ResponseEntity<ContentRatingResponse> rateContent(
            @PathVariable UUID contentId,
            @RequestBody ContentRatingRequest request,
            Authentication authentication
    ) throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        int rating = request == null || request.rating() == null ? 0 : request.rating();
        return ResponseEntity.ok(contentRatingService.updateRating(contentId, UUID.fromString(jwt.getSubject()), rating));
    }

    @PostMapping("/{contentId}/flags")
    @PreAuthorize("hasRole('LEARNER')")
    public ResponseEntity<ContentFlag> flagContent(
            @PathVariable UUID contentId,
            @Valid @RequestBody CreateContentFlagRequest request,
            Authentication authentication
    ) throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID reportedBy = UUID.fromString(jwt.getSubject());

        ContentFlag flag = contentFlagService.createFlag(
                contentId,
                reportedBy,
                request.reason(),
                request.details()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(flag);
    }

    @GetMapping("/flags")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ContentFlag>> getOpenFlags() {
        return ResponseEntity.ok(contentFlagService.getOpenFlags());
    }

    @GetMapping("/{contentId}/flags")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ContentFlag>> getFlagsForContent(@PathVariable UUID contentId)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(contentFlagService.getFlagsForContent(contentId));
    }

    @PutMapping("/flags/{contentFlagId}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ContentFlag> reviewFlag(
            @PathVariable UUID contentFlagId,
            @Valid @RequestBody ReviewContentFlagRequest request,
            Authentication authentication
    ) throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID reviewedBySupabaseUserId = UUID.fromString(jwt.getSubject());

        ContentFlag flag = contentFlagService.reviewFlag(
                contentFlagId,
                reviewedBySupabaseUserId,
                request.status(),
                request.resolutionNotes()
        );

        return ResponseEntity.ok(flag);
    }

    public record SubmitContentRequest(
            UUID topicId,
            UUID npcId,
            UUID mapId,
            String title,
            String description,
            @NotEmpty List<String> narrations,
            String videoUrl,
            UUID resubmittedFromId
    ) {}

    public record CreateContentFlagRequest(
            ContentFlag.FlagReason reason,
            String details
    ) {}
    
    public record ReviewContentFlagRequest(
            ContentFlag.FlagStatus status,
            String resolutionNotes
    ) {}

    public record RejectContentRequest(
            String rejectionReason, 
            String adminComments
    ) {}
}
