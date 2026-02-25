package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/contents")
public class ContentController {

    private final ContentService service;

    public ContentController(ContentService service) {
        this.service = service;
    }

    // Contributor submits content - triggers AI screening immediately
    @PostMapping
    // @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<Content> submitContent(@RequestBody SubmitContentRequest request)
            throws ResourceNotFoundException {
        Content content = service.submitContent(
                request.contributorId(),
                request.topicId(),
                request.title(),
                request.description()
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
    @PreAuthorize("hasRole('CONTRIBUTOR') or hasRole('ADMIN')")
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
    public ResponseEntity<Content> reject(@PathVariable UUID contentId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.rejectContent(contentId));
    }

    public record SubmitContentRequest(UUID contributorId, UUID topicId, String title, String description) {}
}