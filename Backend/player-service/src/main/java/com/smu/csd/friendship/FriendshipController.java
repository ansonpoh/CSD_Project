package com.smu.csd.friendship;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/learner/friends")
public class FriendshipController {
    public record CreateFriendRequest(UUID targetLearnerId) {}

    private final FriendshipService friendshipService;

    public FriendshipController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<FriendSearchResultDto>> searchByUsername(
            Authentication authentication,
            @RequestParam String query,
            @RequestParam(required = false) Integer limit
    ) throws ResourceNotFoundException {
        return ResponseEntity.ok(friendshipService.searchByUsername(getSupabaseUserId(authentication), query, limit));
    }

    @PostMapping("/requests")
    public ResponseEntity<FriendRequestDto> sendFriendRequest(
            Authentication authentication,
            @RequestBody CreateFriendRequest request
    ) throws ResourceNotFoundException {
        if (request == null || request.targetLearnerId() == null) {
            throw new IllegalArgumentException("targetLearnerId is required.");
        }

        FriendRequestDto created = friendshipService.sendRequest(getSupabaseUserId(authentication), request.targetLearnerId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<FriendRequestDto>> getIncomingRequests(Authentication authentication)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(friendshipService.getIncomingRequests(getSupabaseUserId(authentication)));
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<FriendRequestDto>> getOutgoingRequests(Authentication authentication)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(friendshipService.getOutgoingRequests(getSupabaseUserId(authentication)));
    }

    @PostMapping("/requests/{friendshipId}/accept")
    public ResponseEntity<FriendRequestDto> acceptRequest(
            Authentication authentication,
            @PathVariable UUID friendshipId
    ) throws ResourceNotFoundException {
        return ResponseEntity.ok(friendshipService.acceptRequest(getSupabaseUserId(authentication), friendshipId));
    }

    @PostMapping("/requests/{friendshipId}/decline")
    public ResponseEntity<FriendRequestDto> declineRequest(
            Authentication authentication,
            @PathVariable UUID friendshipId
    ) throws ResourceNotFoundException {
        return ResponseEntity.ok(friendshipService.declineRequest(getSupabaseUserId(authentication), friendshipId));
    }

    @DeleteMapping("/requests/{friendshipId}")
    public ResponseEntity<Void> cancelOutgoingRequest(
            Authentication authentication,
            @PathVariable UUID friendshipId
    ) throws ResourceNotFoundException {
        friendshipService.cancelOutgoingRequest(getSupabaseUserId(authentication), friendshipId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/list")
    public ResponseEntity<List<FriendUserSummaryDto>> listFriends(Authentication authentication)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(friendshipService.listFriends(getSupabaseUserId(authentication)));
    }

    @DeleteMapping("/list/{friendLearnerId}")
    public ResponseEntity<Void> removeFriend(
            Authentication authentication,
            @PathVariable UUID friendLearnerId
    ) throws ResourceNotFoundException {
        friendshipService.removeFriend(getSupabaseUserId(authentication), friendLearnerId);
        return ResponseEntity.noContent().build();
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
