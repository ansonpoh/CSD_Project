package com.smu.csd.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import com.smu.csd.friendship.Friendship;
import com.smu.csd.friendship.FriendshipRepository;
import com.smu.csd.friendship.FriendshipStatus;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

public class ChatServiceUnitTest {

    private ChatConversationRepository chatConversationRepository;
    private ChatMessageRepository chatMessageRepository;
    private ChatUserSettingsRepository chatUserSettingsRepository;
    private LearnerRepository learnerRepository;
    private FriendshipRepository friendshipRepository;
    private ChatService service;

    @BeforeEach
    void setUp() {
        chatConversationRepository = mock(ChatConversationRepository.class);
        chatMessageRepository = mock(ChatMessageRepository.class);
        chatUserSettingsRepository = mock(ChatUserSettingsRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        friendshipRepository = mock(FriendshipRepository.class);
        service = new ChatService(
                chatConversationRepository,
                chatMessageRepository,
                chatUserSettingsRepository,
                learnerRepository,
                friendshipRepository
        );
    }

    @Test
    void openOrCreateConversation_RejectsChattingWithSelf() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.findById(current.getLearnerId())).thenReturn(Optional.of(current));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.openOrCreateConversation(supabaseUserId, current.getLearnerId())
        );

        assertEquals("You cannot open a chat with yourself.", exception.getMessage());
    }

    @Test
    void openOrCreateConversation_RejectsNonFriends() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.findById(friend.getLearnerId())).thenReturn(Optional.of(friend));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.empty());

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.openOrCreateConversation(supabaseUserId, friend.getLearnerId())
        );

        assertEquals("Only accepted friends can chat.", exception.getMessage());
    }

    @Test
    void openOrCreateConversation_ReturnsExistingConversationIfPresent() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        ChatConversation conversation = conversation(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId());
        Friendship accepted = friendship(current.getLearnerId(), friend.getLearnerId());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.findById(friend.getLearnerId())).thenReturn(Optional.of(friend));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(chatConversationRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(conversation));

        ChatConversationDto result = service.openOrCreateConversation(supabaseUserId, friend.getLearnerId());

        assertEquals(conversation.getChatConversationId(), result.chatConversationId());
        assertEquals(friend.getLearnerId(), result.friend().learnerId());
        verify(chatConversationRepository, never()).save(any(ChatConversation.class));
    }

    @Test
    void openOrCreateConversation_CreatesNewConversationWhenAbsent() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        Friendship accepted = friendship(current.getLearnerId(), friend.getLearnerId());
        ChatConversation saved = conversation(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.findById(friend.getLearnerId())).thenReturn(Optional.of(friend));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(chatConversationRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.empty());
        when(chatConversationRepository.save(any(ChatConversation.class))).thenReturn(saved);

        ChatConversationDto result = service.openOrCreateConversation(supabaseUserId, friend.getLearnerId());

        assertEquals(saved.getChatConversationId(), result.chatConversationId());
        verify(chatConversationRepository).save(any(ChatConversation.class));
    }

    @Test
    void listConversations_ReturnsEmptyWhenNoConversationsExist() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(chatConversationRepository.findAllForLearner(current.getLearnerId())).thenReturn(List.of());

        List<ChatConversationSummaryDto> result = service.listConversations(supabaseUserId);

        assertTrue(result.isEmpty());
    }

    @Test
    void listMessages_RejectsCursorFromDifferentConversation() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        ChatConversation conversation = conversation(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId());
        ChatConversation otherConversation = conversation(UUID.randomUUID(), current.getLearnerId(), UUID.randomUUID());
        ChatMessage cursor = message(UUID.randomUUID(), otherConversation.getChatConversationId(), friend.getLearnerId(), "hi", LocalDateTime.now());
        Friendship accepted = friendship(current.getLearnerId(), friend.getLearnerId());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(chatConversationRepository.findById(conversation.getChatConversationId())).thenReturn(Optional.of(conversation));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(chatMessageRepository.findById(cursor.getChatMessageId())).thenReturn(Optional.of(cursor));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.listMessages(supabaseUserId, conversation.getChatConversationId(), cursor.getChatMessageId(), 10)
        );

        assertEquals("Cursor does not belong to this conversation.", exception.getMessage());
    }

    @Test
    void listMessages_ReturnsNextCursorWhenPageSizeExceeded() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        ChatConversation conversation = conversation(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId());
        Friendship accepted = friendship(current.getLearnerId(), friend.getLearnerId());
        ChatMessage first = message(UUID.randomUUID(), conversation.getChatConversationId(), current.getLearnerId(), "first", LocalDateTime.now().minusMinutes(1));
        ChatMessage second = message(UUID.randomUUID(), conversation.getChatConversationId(), friend.getLearnerId(), "second", LocalDateTime.now());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(chatConversationRepository.findById(conversation.getChatConversationId())).thenReturn(Optional.of(conversation));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(chatMessageRepository.findPage(eq(conversation.getChatConversationId()), any(PageRequest.class))).thenReturn(List.of(second, first));

        ChatMessagePageDto result = service.listMessages(supabaseUserId, conversation.getChatConversationId(), null, 1);

        assertEquals(1, result.messages().size());
        assertEquals(second.getChatMessageId(), result.nextCursor());
    }

    @Test
    void sendMessage_RejectsWhenEitherSideIsBlocked() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        ChatConversation conversation = conversation(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId());
        Friendship accepted = friendship(current.getLearnerId(), friend.getLearnerId());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(chatConversationRepository.findById(conversation.getChatConversationId())).thenReturn(Optional.of(conversation));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(current.getLearnerId(), friend.getLearnerId())).thenReturn(true);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.sendMessage(supabaseUserId, conversation.getChatConversationId(), "hello")
        );

        assertEquals("Messaging is blocked for this user.", exception.getMessage());
        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
    }

    @Test
    void sendMessage_RejectsBlankAndOversizedBodiesAndTrimsValidInput() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        ChatConversation conversation = conversation(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId());
        Friendship accepted = friendship(current.getLearnerId(), friend.getLearnerId());
        ChatMessage saved = message(UUID.randomUUID(), conversation.getChatConversationId(), current.getLearnerId(), "trimmed text", LocalDateTime.now());

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(chatConversationRepository.findById(conversation.getChatConversationId())).thenReturn(Optional.of(conversation));
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(current.getLearnerId(), friend.getLearnerId())).thenReturn(false);
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(friend.getLearnerId(), current.getLearnerId())).thenReturn(false);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(saved);
        when(chatConversationRepository.save(any(ChatConversation.class))).thenReturn(conversation);

        assertThrows(IllegalArgumentException.class, () -> service.sendMessage(supabaseUserId, conversation.getChatConversationId(), "   "));
        assertThrows(IllegalArgumentException.class, () -> service.sendMessage(supabaseUserId, conversation.getChatConversationId(), "x".repeat(1001)));

        ChatMessageDto result = service.sendMessage(supabaseUserId, conversation.getChatConversationId(), "  trimmed text  ");

        assertEquals("trimmed text", result.body());
        assertTrue(result.mine());
    }

    @Test
    void updateSettings_CreatesDefaultSettingsRowWhenNoneExists() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner target = learner(UUID.randomUUID(), "target");

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.findById(target.getLearnerId())).thenReturn(Optional.of(target));
        when(chatUserSettingsRepository.findByOwnerLearnerIdAndTargetLearnerId(current.getLearnerId(), target.getLearnerId()))
                .thenReturn(Optional.empty());
        when(chatUserSettingsRepository.save(any(ChatUserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatSettingsDto result = service.updateSettings(supabaseUserId, target.getLearnerId(), null, null);

        assertFalse(result.isMuted());
        assertFalse(result.isBlocked());
        verify(chatUserSettingsRepository).save(any(ChatUserSettings.class));
    }

    private Learner learner(UUID id, String username) {
        return Learner.builder()
                .learnerId(id)
                .supabaseUserId(UUID.randomUUID())
                .username(username)
                .level(1)
                .is_active(true)
                .build();
    }

    private Friendship friendship(UUID requesterId, UUID addresseeId) {
        return Friendship.builder()
                .friendshipId(UUID.randomUUID())
                .requesterId(requesterId)
                .addresseeId(addresseeId)
                .status(FriendshipStatus.ACCEPTED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private ChatConversation conversation(UUID id, UUID a, UUID b) {
        return ChatConversation.builder()
                .chatConversationId(id)
                .userAId(a)
                .userBId(b)
                .createdAt(LocalDateTime.now())
                .lastMessageAt(LocalDateTime.now())
                .build();
    }

    private ChatMessage message(UUID id, UUID conversationId, UUID senderId, String body, LocalDateTime createdAt) {
        return ChatMessage.builder()
                .chatMessageId(id)
                .chatConversationId(conversationId)
                .senderId(senderId)
                .body(body)
                .createdAt(createdAt)
                .build();
    }
}
