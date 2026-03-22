package com.smu.csd.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/learner/chat")
public class ChatController {
    public record SendMessageRequest(String body) {}
    public record UpdateChatSettingsRequest(Boolean isMuted, Boolean isBlocked) {}

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/friends/{friendLearnerId}/conversation")
    public ResponseEntity<ChatConversationDto> openOrCreateConversation(
            Authentication authentication,
            @PathVariable UUID friendLearnerId
    ) throws ResourceNotFoundException {
        return ResponseEntity.ok(chatService.openOrCreateConversation(getSupabaseUserId(authentication), friendLearnerId));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ChatConversationSummaryDto>> listConversations(Authentication authentication)
            throws ResourceNotFoundException {
        return ResponseEntity.ok(chatService.listConversations(getSupabaseUserId(authentication)));
    }

    @GetMapping("/conversations/{chatConversationId}/messages")
    public ResponseEntity<ChatMessagePageDto> listMessages(
            Authentication authentication,
            @PathVariable UUID chatConversationId,
            @RequestParam(required = false) UUID before,
            @RequestParam(required = false) Integer limit
    ) throws ResourceNotFoundException {
        return ResponseEntity.ok(chatService.listMessages(getSupabaseUserId(authentication), chatConversationId, before, limit));
    }

    @PostMapping("/conversations/{chatConversationId}/messages")
    public ResponseEntity<ChatMessageDto> sendMessage(
            Authentication authentication,
            @PathVariable UUID chatConversationId,
            @RequestBody SendMessageRequest request
    ) throws ResourceNotFoundException {
        if (request == null || request.body() == null) {
            throw new IllegalArgumentException("body is required.");
        }
        return ResponseEntity.ok(chatService.sendMessage(getSupabaseUserId(authentication), chatConversationId, request.body()));
    }

    @PutMapping("/settings/{targetLearnerId}")
    public ResponseEntity<ChatSettingsDto> updateSettings(
            Authentication authentication,
            @PathVariable UUID targetLearnerId,
            @RequestBody UpdateChatSettingsRequest request
    ) throws ResourceNotFoundException {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required.");
        }
        return ResponseEntity.ok(chatService.updateSettings(
                getSupabaseUserId(authentication),
                targetLearnerId,
                request.isMuted(),
                request.isBlocked()
        ));
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
