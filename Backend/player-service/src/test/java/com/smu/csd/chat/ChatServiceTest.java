package com.smu.csd.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.friendship.Friendship;
import com.smu.csd.friendship.FriendshipRepository;
import com.smu.csd.friendship.FriendshipStatus;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatConversationRepository chatConversationRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private ChatUserSettingsRepository chatUserSettingsRepository;
    @Mock
    private LearnerRepository learnerRepository;
    @Mock
    private FriendshipRepository friendshipRepository;

    @InjectMocks
    private ChatService chatService;

    private UUID meSupabaseId;
    private UUID meLearnerId;
    private UUID friendLearnerId;
    private Learner me;
    private Learner friend;

    @BeforeEach
    void setUp() {
        meSupabaseId = UUID.randomUUID();
        meLearnerId = UUID.randomUUID();
        friendLearnerId = UUID.randomUUID();

        me = activeLearner(meLearnerId, meSupabaseId, "me");
        friend = activeLearner(friendLearnerId, UUID.randomUUID(), "friend");
    }

    @Test
    void openOrCreateConversation_rejectsSelfChat() {
        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(meLearnerId)).thenReturn(Optional.of(me));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> chatService.openOrCreateConversation(meSupabaseId, meLearnerId));

        assertEquals("You cannot open a chat with yourself.", ex.getMessage());
    }

    @Test
    void openOrCreateConversation_throwsWhenNotAcceptedFriends() {
        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(friendLearnerId)).thenReturn(Optional.of(friend));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId)).thenReturn(Optional.empty());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> chatService.openOrCreateConversation(meSupabaseId, friendLearnerId));

        assertEquals("Only accepted friends can chat.", ex.getMessage());
    }

    @Test
    void openOrCreateConversation_createsWhenMissing() throws ResourceNotFoundException {
        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(friendLearnerId)).thenReturn(Optional.of(friend));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(friendship(meLearnerId, friendLearnerId, FriendshipStatus.ACCEPTED)));
        when(chatConversationRepository.findBetween(meLearnerId, friendLearnerId)).thenReturn(Optional.empty());
        when(chatConversationRepository.save(any(ChatConversation.class))).thenAnswer(invocation -> {
            ChatConversation c = invocation.getArgument(0);
            c.setChatConversationId(UUID.randomUUID());
            return c;
        });

        ChatConversationDto dto = chatService.openOrCreateConversation(meSupabaseId, friendLearnerId);

        assertNotNull(dto.chatConversationId());
        assertEquals(friendLearnerId, dto.friend().learnerId());
        verify(chatConversationRepository).save(any(ChatConversation.class));
    }

    @Test
    void openOrCreateConversation_reusesExistingConversation() throws ResourceNotFoundException {
        UUID convoId = UUID.randomUUID();
        ChatConversation existing = conversation(convoId, meLearnerId, friendLearnerId);

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(friendLearnerId)).thenReturn(Optional.of(friend));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(friendship(meLearnerId, friendLearnerId, FriendshipStatus.ACCEPTED)));
        when(chatConversationRepository.findBetween(meLearnerId, friendLearnerId)).thenReturn(Optional.of(existing));

        ChatConversationDto dto = chatService.openOrCreateConversation(meSupabaseId, friendLearnerId);

        assertEquals(convoId, dto.chatConversationId());
        assertEquals(friendLearnerId, dto.friend().learnerId());
        verify(chatConversationRepository, never()).save(any(ChatConversation.class));
    }

    @Test
    void listConversations_sortsByLastMessageAndMapsPreviewAndSettings() throws ResourceNotFoundException {
        UUID convoANew = UUID.randomUUID();
        UUID convoBOlder = UUID.randomUUID();
        UUID friendAId = UUID.randomUUID();
        UUID friendBId = UUID.randomUUID();

        Learner friendA = activeLearner(friendAId, UUID.randomUUID(), "friendA");
        Learner friendB = activeLearner(friendBId, UUID.randomUUID(), "friendB");

        ChatConversation c1 = conversation(convoANew, meLearnerId, friendAId);
        ChatConversation c2 = conversation(convoBOlder, meLearnerId, friendBId);

        ChatMessage latest1 = ChatMessage.builder()
                .chatMessageId(UUID.randomUUID())
                .chatConversationId(convoANew)
                .senderId(friendAId)
                .body("hello\nthere")
                .createdAt(LocalDateTime.now().minusMinutes(5))
                .build();
        ChatMessage latest2 = ChatMessage.builder()
                .chatMessageId(UUID.randomUUID())
                .chatConversationId(convoBOlder)
                .senderId(friendBId)
                .body("older")
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        ChatUserSettings settings = ChatUserSettings.builder()
                .ownerLearnerId(meLearnerId)
                .targetLearnerId(friendAId)
                .isMuted(true)
                .isBlocked(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findAllForLearner(meLearnerId)).thenReturn(List.of(c2, c1));
        when(learnerRepository.findAllById(any())).thenReturn(List.of(friendA, friendB));
        when(chatUserSettingsRepository.findByOwnerLearnerIdAndTargetLearnerIdIn(eq(meLearnerId), any()))
                .thenReturn(List.of(settings));
        when(chatMessageRepository.findLatestByConversationIds(any())).thenReturn(List.of(latest2, latest1));

        List<ChatConversationSummaryDto> summaries = chatService.listConversations(meSupabaseId);

        assertEquals(2, summaries.size());
        assertEquals(convoANew, summaries.get(0).chatConversationId());
        assertEquals("hello there", summaries.get(0).lastMessagePreview());
        assertTrue(summaries.get(0).muted());
        assertFalse(summaries.get(0).blocked());
        assertEquals(convoBOlder, summaries.get(1).chatConversationId());
    }

    @Test
    void listMessages_rejectsCursorFromAnotherConversation() throws ResourceNotFoundException {
        UUID convoId = UUID.randomUUID();
        UUID wrongConvoId = UUID.randomUUID();
        UUID cursorId = UUID.randomUUID();

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, meLearnerId, friendLearnerId)));
        when(chatMessageRepository.findById(cursorId))
                .thenReturn(Optional.of(ChatMessage.builder()
                        .chatMessageId(cursorId)
                        .chatConversationId(wrongConvoId)
                        .senderId(friendLearnerId)
                        .body("x")
                        .createdAt(LocalDateTime.now())
                        .build()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> chatService.listMessages(meSupabaseId, convoId, cursorId, 10));

        assertEquals("Cursor does not belong to this conversation.", ex.getMessage());
    }

    @Test
    void listMessages_rejectsWhenRequesterIsNotParticipant() {
        UUID convoId = UUID.randomUUID();
        UUID otherA = UUID.randomUUID();
        UUID otherB = UUID.randomUUID();

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, otherA, otherB)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> chatService.listMessages(meSupabaseId, convoId, null, 10));

        assertEquals("You are not a participant in this conversation.", ex.getMessage());
    }

    @Test
    void listMessages_clampsLimitAndReturnsNextCursor() throws ResourceNotFoundException {
        UUID convoId = UUID.randomUUID();
        ChatMessage m1 = message(convoId, meLearnerId, "first");
        ChatMessage m2 = message(convoId, friendLearnerId, "second");

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, meLearnerId, friendLearnerId)));
        when(chatMessageRepository.findPage(eq(convoId), any())).thenReturn(List.of(m1, m2));

        ChatMessagePageDto page = chatService.listMessages(meSupabaseId, convoId, null, 1);

        assertEquals(1, page.messages().size());
        assertEquals(m1.getChatMessageId(), page.messages().get(0).chatMessageId());
        assertEquals(m1.getSenderId().equals(meLearnerId), page.messages().get(0).mine());
        assertEquals(m1.getChatMessageId(), page.nextCursor());
    }

    @Test
    void listMessages_withBeforeCursorUsesOlderPageQuery() throws ResourceNotFoundException {
        UUID convoId = UUID.randomUUID();
        UUID cursorId = UUID.randomUUID();
        LocalDateTime cursorTime = LocalDateTime.now().minusMinutes(10);
        ChatMessage older = message(convoId, friendLearnerId, "older");

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, meLearnerId, friendLearnerId)));
        when(chatMessageRepository.findById(cursorId))
                .thenReturn(Optional.of(ChatMessage.builder()
                        .chatMessageId(cursorId)
                        .chatConversationId(convoId)
                        .senderId(friendLearnerId)
                        .body("cursor")
                        .createdAt(cursorTime)
                        .build()));
        when(chatMessageRepository.findPageBefore(eq(convoId), eq(cursorTime), any())).thenReturn(List.of(older));

        ChatMessagePageDto page = chatService.listMessages(meSupabaseId, convoId, cursorId, 10);

        assertEquals(1, page.messages().size());
        assertEquals(older.getChatMessageId(), page.messages().get(0).chatMessageId());
        assertEquals(null, page.nextCursor());
    }

    @Test
    void sendMessage_rejectsBlankBodyAfterTrim() {
        UUID convoId = UUID.randomUUID();

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, meLearnerId, friendLearnerId)));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(friendship(meLearnerId, friendLearnerId, FriendshipStatus.ACCEPTED)));
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(any(), any()))
                .thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> chatService.sendMessage(meSupabaseId, convoId, "   \n "));

        assertEquals("Message body is required.", ex.getMessage());
        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
    }

    @Test
    void sendMessage_rejectsBodyAboveMaxLength() {
        UUID convoId = UUID.randomUUID();
        String tooLong = "a".repeat(1001);

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, meLearnerId, friendLearnerId)));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(friendship(meLearnerId, friendLearnerId, FriendshipStatus.ACCEPTED)));
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(any(), any()))
                .thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> chatService.sendMessage(meSupabaseId, convoId, tooLong));

        assertTrue(ex.getMessage().contains("Message exceeds max length of 1000"));
    }

    @Test
    void sendMessage_blocksWhenEitherUserBlocked() {
        UUID convoId = UUID.randomUUID();

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId))
                .thenReturn(Optional.of(conversation(convoId, meLearnerId, friendLearnerId)));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(friendship(meLearnerId, friendLearnerId, FriendshipStatus.ACCEPTED)));
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(meLearnerId, friendLearnerId))
                .thenReturn(false);
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(friendLearnerId, meLearnerId))
                .thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> chatService.sendMessage(meSupabaseId, convoId, "hello"));

        assertEquals("Messaging is blocked for this user.", ex.getMessage());
    }

    @Test
    void sendMessage_trimsBodyAndUpdatesConversationTimestamp() throws ResourceNotFoundException {
        UUID convoId = UUID.randomUUID();
        ChatConversation conversation = conversation(convoId, meLearnerId, friendLearnerId);

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId)).thenReturn(Optional.of(conversation));
        when(friendshipRepository.findBetween(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(friendship(meLearnerId, friendLearnerId, FriendshipStatus.ACCEPTED)));
        when(chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(any(), any()))
                .thenReturn(false);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> {
            ChatMessage m = invocation.getArgument(0);
            m.setChatMessageId(UUID.randomUUID());
            return m;
        });
        when(chatConversationRepository.save(any(ChatConversation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatMessageDto dto = chatService.sendMessage(meSupabaseId, convoId, "  hello world  ");

        assertEquals("hello world", dto.body());
        assertTrue(dto.mine());

        ArgumentCaptor<ChatConversation> conversationCaptor = ArgumentCaptor.forClass(ChatConversation.class);
        verify(chatConversationRepository).save(conversationCaptor.capture());
        assertNotNull(conversationCaptor.getValue().getLastMessageAt());
    }

    @Test
    void clearConversationMessages_softDeletesAndResetsLastMessageAt() throws ResourceNotFoundException {
        UUID convoId = UUID.randomUUID();
        ChatConversation convo = conversation(convoId, meLearnerId, friendLearnerId);
        convo.setLastMessageAt(LocalDateTime.now());

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(chatConversationRepository.findById(convoId)).thenReturn(Optional.of(convo));
        when(chatConversationRepository.save(any(ChatConversation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        chatService.clearConversationMessages(meSupabaseId, convoId);

        verify(chatMessageRepository).softDeleteConversationMessages(eq(convoId), any(LocalDateTime.class));
        assertEquals(null, convo.getLastMessageAt());
        verify(chatConversationRepository).save(convo);
    }

    @Test
    void updateSettings_defaultsNullFlagsToFalse() throws ResourceNotFoundException {
        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(friendLearnerId)).thenReturn(Optional.of(friend));
        when(chatUserSettingsRepository.findByOwnerLearnerIdAndTargetLearnerId(meLearnerId, friendLearnerId))
                .thenReturn(Optional.empty());
        when(chatUserSettingsRepository.save(any(ChatUserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatSettingsDto dto = chatService.updateSettings(meSupabaseId, friendLearnerId, null, null);

        assertFalse(dto.isMuted());
        assertFalse(dto.isBlocked());
        assertEquals(meLearnerId, dto.ownerLearnerId());
        assertEquals(friendLearnerId, dto.targetLearnerId());
    }

    @Test
    void updateSettings_rejectsSelfTarget() {
        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(meLearnerId)).thenReturn(Optional.of(me));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> chatService.updateSettings(meSupabaseId, meLearnerId, true, false));

        assertEquals("You cannot update chat settings for yourself.", ex.getMessage());
    }

    @Test
    void updateSettings_updatesExistingFlags() throws ResourceNotFoundException {
        ChatUserSettings existing = ChatUserSettings.builder()
                .ownerLearnerId(meLearnerId)
                .targetLearnerId(friendLearnerId)
                .isMuted(false)
                .isBlocked(false)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        when(learnerRepository.findBySupabaseUserId(meSupabaseId)).thenReturn(me);
        when(learnerRepository.findById(friendLearnerId)).thenReturn(Optional.of(friend));
        when(chatUserSettingsRepository.findByOwnerLearnerIdAndTargetLearnerId(meLearnerId, friendLearnerId))
                .thenReturn(Optional.of(existing));
        when(chatUserSettingsRepository.save(any(ChatUserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatSettingsDto dto = chatService.updateSettings(meSupabaseId, friendLearnerId, true, true);

        assertTrue(dto.isMuted());
        assertTrue(dto.isBlocked());
        assertNotNull(dto.updatedAt());
    }

    private static Learner activeLearner(UUID learnerId, UUID supabaseId, String username) {
        return Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseId)
                .username(username)
                .email(username + "@example.com")
                .is_active(true)
                .level(1)
                .build();
    }

    private static Friendship friendship(UUID requesterId, UUID addresseeId, FriendshipStatus status) {
        return Friendship.builder()
                .requesterId(requesterId)
                .addresseeId(addresseeId)
                .status(status)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private static ChatConversation conversation(UUID conversationId, UUID userA, UUID userB) {
        return ChatConversation.builder()
                .chatConversationId(conversationId)
                .userAId(userA)
                .userBId(userB)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    private static ChatMessage message(UUID conversationId, UUID senderId, String body) {
        return ChatMessage.builder()
                .chatMessageId(UUID.randomUUID())
                .chatConversationId(conversationId)
                .senderId(senderId)
                .body(body)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
