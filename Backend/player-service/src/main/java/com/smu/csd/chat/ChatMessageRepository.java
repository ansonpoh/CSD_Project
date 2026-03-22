package com.smu.csd.chat;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    Optional<ChatMessage> findTopByChatConversationIdAndDeletedAtIsNullOrderByCreatedAtDescChatMessageIdDesc(UUID chatConversationId);

    @Query("""
        select m
        from ChatMessage m
        where m.chatConversationId = :conversationId
          and m.deletedAt is null
        order by m.createdAt desc, m.chatMessageId desc
    """)
    List<ChatMessage> findPage(
            @Param("conversationId") UUID conversationId,
            Pageable pageable
    );

    @Query("""
        select m
        from ChatMessage m
        where m.chatConversationId = :conversationId
          and m.deletedAt is null
          and m.createdAt < :beforeCreatedAt
        order by m.createdAt desc, m.chatMessageId desc
    """)
    List<ChatMessage> findPageBefore(
            @Param("conversationId") UUID conversationId,
            @Param("beforeCreatedAt") LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

    @Query(value = """
        select distinct on (m.chat_conversation_id) m.*
        from roles.chat_message m
        where m.chat_conversation_id in (:conversationIds)
          and m.deleted_at is null
        order by m.chat_conversation_id, m.created_at desc, m.chat_message_id desc
    """, nativeQuery = true)
    List<ChatMessage> findLatestByConversationIds(@Param("conversationIds") Collection<UUID> conversationIds);

}
