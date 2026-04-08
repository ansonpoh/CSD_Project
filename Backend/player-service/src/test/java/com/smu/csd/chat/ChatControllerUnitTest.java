package com.smu.csd.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import com.smu.csd.friendship.FriendUserSummaryDto;

class ChatControllerUnitTest {

    private ChatController controller;
    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatService = mock(ChatService.class);
        controller = new ChatController(chatService);
    }

    @Test
    void openOrCreateConversationDelegatesToService() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID friendLearnerId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        ChatConversationDto expected = new ChatConversationDto(
                UUID.randomUUID(),
                new FriendUserSummaryDto(friendLearnerId, "friend", 3, true),
                null,
                null
        );
        when(chatService.openOrCreateConversation(supabaseUserId, friendLearnerId)).thenReturn(expected);

        ResponseEntity<ChatConversationDto> response = controller.openOrCreateConversation(authentication, friendLearnerId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(chatService).openOrCreateConversation(supabaseUserId, friendLearnerId);
    }

    @Test
    void listMessagesDelegatesIncludingCursorAndLimit() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID chatConversationId = UUID.randomUUID();
        UUID before = UUID.randomUUID();
        Integer limit = 20;
        Authentication authentication = mockAuthentication(supabaseUserId);
        ChatMessagePageDto expected = new ChatMessagePageDto(List.of(), UUID.randomUUID());
        when(chatService.listMessages(supabaseUserId, chatConversationId, before, limit)).thenReturn(expected);

        ResponseEntity<ChatMessagePageDto> response = controller.listMessages(authentication, chatConversationId, before, limit);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(chatService).listMessages(supabaseUserId, chatConversationId, before, limit);
    }

    @Test
    void sendMessageRejectsNullRequest() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> controller.sendMessage(authentication, UUID.randomUUID(), null)
        );

        assertEquals("body is required.", exception.getMessage());
    }

    @Test
    void sendMessageRejectsNullBody() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> controller.sendMessage(authentication, UUID.randomUUID(), new ChatController.SendMessageRequest(null))
        );

        assertEquals("body is required.", exception.getMessage());
    }

    @Test
    void clearMessagesReturnsNoContent() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID chatConversationId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        ResponseEntity<Void> response = controller.clearMessages(authentication, chatConversationId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(chatService).clearConversationMessages(supabaseUserId, chatConversationId);
    }

    @Test
    void updateSettingsRejectsNullRequest() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> controller.updateSettings(authentication, UUID.randomUUID(), null)
        );

        assertEquals("Request body is required.", exception.getMessage());
    }

    @Test
    void updateSettingsDelegatesToService() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID targetLearnerId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        ChatSettingsDto expected = new ChatSettingsDto(supabaseUserId, targetLearnerId, true, false, null);
        when(chatService.updateSettings(supabaseUserId, targetLearnerId, true, false)).thenReturn(expected);

        ResponseEntity<ChatSettingsDto> response = controller.updateSettings(
                authentication,
                targetLearnerId,
                new ChatController.UpdateChatSettingsRequest(true, false)
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(chatService).updateSettings(supabaseUserId, targetLearnerId, true, false);
    }

    private Authentication mockAuthentication(UUID supabaseUserId) {
        Authentication authentication = mock(Authentication.class);
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(supabaseUserId.toString())
                .build();
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(authentication.getAuthorities()).thenReturn(List.of());
        return authentication;
    }
}
