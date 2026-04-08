package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.friendship.FriendUserSummaryDto;
import com.smu.csd.friendship.Friendship;
import com.smu.csd.friendship.FriendshipRepository;
import com.smu.csd.friendship.FriendshipStatus;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@Service
public class ChatService {
    private static final int DEFAULT_MESSAGE_PAGE_SIZE = 30;
    private static final int MAX_MESSAGE_PAGE_SIZE = 100;
    private static final int MAX_MESSAGE_LENGTH = 1000;

    private final ChatConversationRepository chatConversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatUserSettingsRepository chatUserSettingsRepository;
    private final LearnerRepository learnerRepository;
    private final FriendshipRepository friendshipRepository;

    public ChatService(
            ChatConversationRepository chatConversationRepository,
            ChatMessageRepository chatMessageRepository,
            ChatUserSettingsRepository chatUserSettingsRepository,
            LearnerRepository learnerRepository,
            FriendshipRepository friendshipRepository
    ) {
        this.chatConversationRepository = chatConversationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatUserSettingsRepository = chatUserSettingsRepository;
        this.learnerRepository = learnerRepository;
        this.friendshipRepository = friendshipRepository;
    }

    @Transactional
    public ChatConversationDto openOrCreateConversation(UUID requesterSupabaseUserId, UUID friendLearnerId)
            throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Learner friend = requireActiveLearnerById(friendLearnerId);

        if (current.getLearnerId().equals(friend.getLearnerId())) {
            throw new IllegalArgumentException("You cannot open a chat with yourself.");
        }
        ensureAcceptedFriendship(current.getLearnerId(), friend.getLearnerId());

        ChatConversation conversation = chatConversationRepository.findBetween(current.getLearnerId(), friend.getLearnerId())
                .orElseGet(() -> chatConversationRepository.save(ChatConversation.builder()
                        .userAId(current.getLearnerId())
                        .userBId(friend.getLearnerId())
                        .createdAt(LocalDateTime.now())
                        .lastMessageAt(null)
                        .build()));

        return toConversationDto(conversation, friend);
    }

    public List<ChatConversationSummaryDto> listConversations(UUID requesterSupabaseUserId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        List<ChatConversation> conversations = chatConversationRepository.findAllForLearner(current.getLearnerId());
        if (conversations.isEmpty()) {
            return List.of();
        }

        Set<UUID> otherIds = conversations.stream()
                .map(c -> getOtherParticipant(c, current.getLearnerId()))
                .collect(Collectors.toSet());

        Map<UUID, Learner> learnerMap = learnerRepository.findAllById(otherIds).stream()
                .collect(Collectors.toMap(Learner::getLearnerId, Function.identity()));

        Map<UUID, ChatUserSettings> mySettings = chatUserSettingsRepository
                .findByOwnerLearnerIdAndTargetLearnerIdIn(current.getLearnerId(), otherIds)
                .stream()
                .collect(Collectors.toMap(ChatUserSettings::getTargetLearnerId, Function.identity()));

        Map<UUID, ChatMessage> lastMessageMap = getLastMessageMap(
                conversations.stream().map(ChatConversation::getChatConversationId).toList()
        );

        return conversations.stream()
                .map(conversation -> {
                    UUID otherId = getOtherParticipant(conversation, current.getLearnerId());
                    Learner friend = learnerMap.get(otherId);
                    ChatMessage lastMessage = lastMessageMap.get(conversation.getChatConversationId());
                    ChatUserSettings settings = mySettings.get(otherId);
                    return new ChatConversationSummaryDto(
                            conversation.getChatConversationId(),
                            toUserSummary(friend),
                            lastMessage == null ? null : preview(lastMessage.getBody()),
                            lastMessage == null ? conversation.getLastMessageAt() : lastMessage.getCreatedAt(),
                            settings != null && Boolean.TRUE.equals(settings.getIsMuted()),
                            settings != null && Boolean.TRUE.equals(settings.getIsBlocked()),
                            conversation.getCreatedAt()
                    );
                })
                .sorted(Comparator.comparing(
                        ChatConversationSummaryDto::lastMessageAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ).thenComparing(ChatConversationSummaryDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public ChatMessagePageDto listMessages(
            UUID requesterSupabaseUserId,
            UUID chatConversationId,
            UUID beforeCursor,
            Integer limit
    ) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        ChatConversation conversation = requireOwnedConversation(current.getLearnerId(), chatConversationId);
        int pageSize = normalizeLimit(limit);

        LocalDateTime beforeCreatedAt = null;
        UUID beforeMessageId = null;
        if (beforeCursor != null) {
            ChatMessage cursor = chatMessageRepository.findById(beforeCursor)
                    .orElseThrow(() -> new ResourceNotFoundException("ChatMessage", "id", beforeCursor));
            if (!cursor.getChatConversationId().equals(chatConversationId)) {
                throw new IllegalArgumentException("Cursor does not belong to this conversation.");
            }
            beforeCreatedAt = cursor.getCreatedAt();
            beforeMessageId = cursor.getChatMessageId();
        }

        List<ChatMessage> records = beforeCreatedAt == null
                ? chatMessageRepository.findPage(
                        chatConversationId,
                        PageRequest.of(0, pageSize + 1)
                )
                : chatMessageRepository.findPageBefore(
                        chatConversationId,
                        beforeCreatedAt,
                        beforeMessageId,
                        PageRequest.of(0, pageSize + 1)
                );

        UUID nextCursor = null;
        if (records.size() > pageSize) {
            records = records.subList(0, pageSize);
            nextCursor = records.get(records.size() - 1).getChatMessageId();
        }

        List<ChatMessageDto> messages = records.stream()
                .map(message -> toMessageDto(message, current.getLearnerId()))
                .toList();

        return new ChatMessagePageDto(messages, nextCursor);
    }

    @Transactional
    public ChatMessageDto sendMessage(UUID requesterSupabaseUserId, UUID chatConversationId, String rawBody)
            throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        ChatConversation conversation = requireOwnedConversation(current.getLearnerId(), chatConversationId);
        UUID otherId = getOtherParticipant(conversation, current.getLearnerId());

        ensureAcceptedFriendship(current.getLearnerId(), otherId);
        ensureNotBlocked(current.getLearnerId(), otherId);

        String body = normalizeMessageBody(rawBody);
        LocalDateTime now = LocalDateTime.now();

        ChatMessage saved = chatMessageRepository.save(ChatMessage.builder()
                .chatConversationId(chatConversationId)
                .senderId(current.getLearnerId())
                .body(body)
                .createdAt(now)
                .editedAt(null)
                .deletedAt(null)
                .build());

        conversation.setLastMessageAt(now);
        chatConversationRepository.save(conversation);

        return toMessageDto(saved, current.getLearnerId());
    }

    @Transactional
    public void clearConversationMessages(UUID requesterSupabaseUserId, UUID chatConversationId)
            throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        ChatConversation conversation = requireOwnedConversation(current.getLearnerId(), chatConversationId);

        LocalDateTime now = LocalDateTime.now();
        chatMessageRepository.softDeleteConversationMessages(chatConversationId, now);
        conversation.setLastMessageAt(null);
        chatConversationRepository.save(conversation);
    }

    @Transactional
    public ChatSettingsDto updateSettings(UUID requesterSupabaseUserId, UUID targetLearnerId, Boolean isMuted, Boolean isBlocked)
            throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Learner target = requireActiveLearnerById(targetLearnerId);
        if (current.getLearnerId().equals(target.getLearnerId())) {
            throw new IllegalArgumentException("You cannot update chat settings for yourself.");
        }

        ChatUserSettings settings = chatUserSettingsRepository
                .findByOwnerLearnerIdAndTargetLearnerId(current.getLearnerId(), target.getLearnerId())
                .orElse(ChatUserSettings.builder()
                        .ownerLearnerId(current.getLearnerId())
                        .targetLearnerId(target.getLearnerId())
                        .createdAt(LocalDateTime.now())
                        .build());

        settings.setIsMuted(isMuted != null && isMuted);
        settings.setIsBlocked(isBlocked != null && isBlocked);
        settings.setUpdatedAt(LocalDateTime.now());

        ChatUserSettings saved = chatUserSettingsRepository.save(settings);
        return new ChatSettingsDto(
                saved.getOwnerLearnerId(),
                saved.getTargetLearnerId(),
                Boolean.TRUE.equals(saved.getIsMuted()),
                Boolean.TRUE.equals(saved.getIsBlocked()),
                saved.getUpdatedAt()
        );
    }

    private String normalizeMessageBody(String body) {
        String normalized = String.valueOf(body == null ? "" : body).trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Message body is required.");
        }
        if (normalized.length() > MAX_MESSAGE_LENGTH) {
            throw new IllegalArgumentException("Message exceeds max length of " + MAX_MESSAGE_LENGTH + " characters.");
        }
        return normalized;
    }

    private int normalizeLimit(Integer limit) {
        int requested = limit == null ? DEFAULT_MESSAGE_PAGE_SIZE : limit;
        return Math.max(1, Math.min(MAX_MESSAGE_PAGE_SIZE, requested));
    }

    private ChatConversation requireOwnedConversation(UUID learnerId, UUID chatConversationId) throws ResourceNotFoundException {
        ChatConversation conversation = chatConversationRepository.findById(chatConversationId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatConversation", "id", chatConversationId));
        if (!conversation.getUserAId().equals(learnerId) && !conversation.getUserBId().equals(learnerId)) {
            throw new IllegalArgumentException("You are not a participant in this conversation.");
        }
        return conversation;
    }

    private UUID getOtherParticipant(ChatConversation conversation, UUID learnerId) {
        return conversation.getUserAId().equals(learnerId) ? conversation.getUserBId() : conversation.getUserAId();
    }

    private void ensureAcceptedFriendship(UUID learnerAId, UUID learnerBId) {
        Friendship friendship = friendshipRepository.findBetween(learnerAId, learnerBId).orElse(null);
        if (friendship == null || friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new IllegalStateException("Only accepted friends can chat.");
        }
    }

    private void ensureNotBlocked(UUID learnerAId, UUID learnerBId) {
        boolean blocked = chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(learnerAId, learnerBId)
                || chatUserSettingsRepository.existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(learnerBId, learnerAId);
        if (blocked) {
            throw new IllegalStateException("Messaging is blocked for this user.");
        }
    }

    private Learner requireActiveLearnerBySupabaseUserId(UUID supabaseUserId) throws ResourceNotFoundException {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null || !Boolean.TRUE.equals(learner.getIs_active())) {
            throw new ResourceNotFoundException("Learner", "supabaseUserId", supabaseUserId);
        }
        return learner;
    }

    private Learner requireActiveLearnerById(UUID learnerId) throws ResourceNotFoundException {
        Learner learner = learnerRepository.findById(learnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Learner", "id", learnerId));
        if (!Boolean.TRUE.equals(learner.getIs_active())) {
            throw new ResourceNotFoundException("Learner", "id", learnerId);
        }
        return learner;
    }

    private Map<UUID, ChatMessage> getLastMessageMap(Collection<UUID> conversationIds) {
        if (conversationIds == null || conversationIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return chatMessageRepository.findLatestByConversationIds(conversationIds).stream()
                .collect(Collectors.toMap(ChatMessage::getChatConversationId, Function.identity(), (left, right) -> left, HashMap::new));
    }

    private ChatConversationDto toConversationDto(ChatConversation conversation, Learner friend) {
        return new ChatConversationDto(
                conversation.getChatConversationId(),
                toUserSummary(friend),
                conversation.getCreatedAt(),
                conversation.getLastMessageAt()
        );
    }

    private ChatMessageDto toMessageDto(ChatMessage message, UUID me) {
        return new ChatMessageDto(
                message.getChatMessageId(),
                message.getChatConversationId(),
                message.getSenderId(),
                message.getBody(),
                message.getCreatedAt(),
                message.getEditedAt(),
                message.getDeletedAt(),
                message.getSenderId().equals(me)
        );
    }

    private FriendUserSummaryDto toUserSummary(Learner learner) {
        if (learner == null) {
            return new FriendUserSummaryDto(null, "Unknown", null, false);
        }
        return new FriendUserSummaryDto(
                learner.getLearnerId(),
                learner.getUsername(),
                learner.getLevel(),
                learner.getIs_active()
        );
    }

    private String preview(String body) {
        if (body == null) {
            return "";
        }
        String normalized = body.replace('\n', ' ').trim();
        int max = 120;
        return normalized.length() <= max ? normalized : normalized.substring(0, max - 3) + "...";
    }
}
