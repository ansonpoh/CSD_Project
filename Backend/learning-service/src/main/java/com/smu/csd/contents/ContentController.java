package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.server.ResponseStatusException;
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
    private final RestTemplate restTemplate;

    @Value("${identity.url:http://localhost:8081}")
    private String identityUrl;

    public ContentController(
            ContentService service,
            ContentFlagService contentFlagService,
            ContentRatingService contentRatingService,
            RestTemplate restTemplate
    ) {
        this.service = service;
        this.contentFlagService = contentFlagService;
        this.contentRatingService = contentRatingService;
        this.restTemplate = restTemplate;
    }

    // Contributor submits content with narration lines.
    // If video is attached, AI screening is skipped and admin review is required.
    @PostMapping
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<Content> submitContent(
            @Valid @RequestBody SubmitContentRequest request,
            Authentication authentication
    )
            throws ResourceNotFoundException {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());
        ContributorLookup contributor = fetchContributorBySupabaseId(jwt, supabaseUserId);
        if (contributor == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contributor record not found.");
        }
        UUID contributorId = contributor.contributorId();

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
    @PreAuthorize("hasRole('ADMIN') or hasRole('CONTRIBUTOR')")
    public ResponseEntity<List<Content>> getByContributor(
            @PathVariable UUID contributorId,
            Authentication authentication
    ) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID supabaseUserId = UUID.fromString(jwt.getSubject());

        if (!isAdmin(authentication)) {
            ContributorLookup contributor = fetchContributorBySupabaseId(jwt, supabaseUserId);
            if (contributor == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contributor record not found.");
            }
            if (!contributorId.equals(contributor.contributorId()) && !contributorId.equals(supabaseUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to access other contributor content.");
            }
            return ResponseEntity.ok(
                    service.getByContributorIdWithFallback(contributor.contributorId(), supabaseUserId)
            );
        }

        ContributorLookup contributor = fetchContributorById(jwt, contributorId);
        if (contributor != null) {
            return ResponseEntity.ok(
                    service.getByContributorIdWithFallback(contributor.contributorId(), contributor.supabaseUserId())
            );
        }
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

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if ("ROLE_ADMIN".equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    private ContributorLookup fetchContributorBySupabaseId(Jwt jwt, UUID supabaseUserId) {
        String url = identityUrl + "/api/contributors/supabase/" + supabaseUserId;
        return fetchContributor(jwt, url);
    }

    private ContributorLookup fetchContributorById(Jwt jwt, UUID contributorId) {
        String url = identityUrl + "/api/contributors/" + contributorId;
        return fetchContributor(jwt, url);
    }

    private ContributorLookup fetchContributor(Jwt jwt, String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.getTokenValue());
        HttpEntity<Void> request = new HttpEntity<>(headers);
        try {
            ResponseEntity<ContributorLookup> response = restTemplate.exchange(
                    url, HttpMethod.GET, request, ContributorLookup.class);
            return response.getBody();
        } catch (Exception ex) {
            return null;
        }
    }

    public record ContributorLookup(UUID contributorId, UUID supabaseUserId) {}
}
