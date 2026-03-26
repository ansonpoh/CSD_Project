package com.smu.csd.chat;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {
    @Query("""
        select c
        from ChatConversation c
        where (c.userAId = :a and c.userBId = :b)
           or (c.userAId = :b and c.userBId = :a)
    """)
    Optional<ChatConversation> findBetween(@Param("a") UUID a, @Param("b") UUID b);

    @Query("""
        select c
        from ChatConversation c
        where c.userAId = :learnerId or c.userBId = :learnerId
        order by c.lastMessageAt desc, c.createdAt desc
    """)
    List<ChatConversation> findAllForLearner(@Param("learnerId") UUID learnerId);

    @Query("""
        select c
        from ChatConversation c
        where c.chatConversationId in :ids
          and (c.userAId = :learnerId or c.userBId = :learnerId)
    """)
    List<ChatConversation> findOwnedConversations(@Param("learnerId") UUID learnerId, @Param("ids") Collection<UUID> ids);
}
