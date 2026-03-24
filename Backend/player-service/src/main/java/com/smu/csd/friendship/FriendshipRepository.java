package com.smu.csd.friendship;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {
    @Query("""
        select f
        from Friendship f
        where (f.requesterId = :a and f.addresseeId = :b)
           or (f.requesterId = :b and f.addresseeId = :a)
    """)
    Optional<Friendship> findBetween(@Param("a") UUID a, @Param("b") UUID b);

    List<Friendship> findByAddresseeIdAndStatusOrderByCreatedAtDesc(UUID addresseeId, FriendshipStatus status);

    List<Friendship> findByRequesterIdAndStatusOrderByCreatedAtDesc(UUID requesterId, FriendshipStatus status);

    @Query("""
        select f
        from Friendship f
        where f.status = 'ACCEPTED'
          and (f.requesterId = :learnerId or f.addresseeId = :learnerId)
    """)
    List<Friendship> findAcceptedForLearner(@Param("learnerId") UUID learnerId);

    @Query("""
        select f
        from Friendship f
        where (f.requesterId = :me and f.addresseeId in :targets)
           or (f.addresseeId = :me and f.requesterId in :targets)
    """)
    List<Friendship> findRelationships(@Param("me") UUID me, @Param("targets") Collection<UUID> targets);
}
