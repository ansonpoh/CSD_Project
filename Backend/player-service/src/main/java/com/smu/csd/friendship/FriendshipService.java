package com.smu.csd.friendship;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
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
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@Service
public class FriendshipService {
    private final FriendshipRepository friendshipRepository;
    private final LearnerRepository learnerRepository;

    public FriendshipService(FriendshipRepository friendshipRepository, LearnerRepository learnerRepository) {
        this.friendshipRepository = friendshipRepository;
        this.learnerRepository = learnerRepository;
    }

    public List<FriendSearchResultDto> searchByUsername(UUID requesterSupabaseUserId, String query, Integer limit)
            throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        String normalized = normalizeQuery(query);
        int maxResults = normalizeLimit(limit);

        List<Learner> candidates = learnerRepository.searchActiveByUsernamePrefix(
                normalized,
                current.getLearnerId(),
                PageRequest.of(0, maxResults)
        );

        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<UUID, Friendship> relationshipMap = getRelationshipMap(
                current.getLearnerId(),
                candidates.stream().map(Learner::getLearnerId).toList()
        );

        return candidates.stream()
                .map(target -> new FriendSearchResultDto(
                        target.getLearnerId(),
                        target.getUsername(),
                        target.getLevel(),
                        target.getIs_active(),
                        resolveRelationship(current.getLearnerId(), relationshipMap.get(target.getLearnerId()))
                ))
                .toList();
    }

    @Transactional
    public FriendRequestDto sendRequest(UUID requesterSupabaseUserId, UUID targetLearnerId)
            throws ResourceNotFoundException {
        Learner requester = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Learner target = requireActiveLearnerById(targetLearnerId);

        if (requester.getLearnerId().equals(target.getLearnerId())) {
            throw new IllegalArgumentException("You cannot send a friend request to yourself.");
        }

        Friendship friendship = friendshipRepository.findBetween(requester.getLearnerId(), target.getLearnerId())
                .orElse(null);

        if (friendship != null) {
            return handleExistingForSend(friendship, requester.getLearnerId(), target.getLearnerId(), requester, target);
        }

        Friendship created = friendshipRepository.save(Friendship.builder()
                .requesterId(requester.getLearnerId())
                .addresseeId(target.getLearnerId())
                .status(FriendshipStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .respondedAt(null)
                .build());
        return toRequestDto(created, requester, target);
    }

    public List<FriendRequestDto> getIncomingRequests(UUID requesterSupabaseUserId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        List<Friendship> requests = friendshipRepository.findByAddresseeIdAndStatusOrderByCreatedAtDesc(
                current.getLearnerId(),
                FriendshipStatus.PENDING
        );
        return mapRequests(requests);
    }

    public List<FriendRequestDto> getOutgoingRequests(UUID requesterSupabaseUserId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        List<Friendship> requests = friendshipRepository.findByRequesterIdAndStatusOrderByCreatedAtDesc(
                current.getLearnerId(),
                FriendshipStatus.PENDING
        );
        return mapRequests(requests);
    }

    @Transactional
    public FriendRequestDto acceptRequest(UUID requesterSupabaseUserId, UUID friendshipId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Friendship friendship = getById(friendshipId);

        if (!friendship.getAddresseeId().equals(current.getLearnerId())) {
            throw new IllegalArgumentException("Only the addressee can accept this friend request.");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be accepted.");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship.setRespondedAt(LocalDateTime.now());
        friendship.setUpdatedAt(LocalDateTime.now());
        Friendship saved = friendshipRepository.save(friendship);
        return toRequestDto(saved);
    }

    @Transactional
    public FriendRequestDto declineRequest(UUID requesterSupabaseUserId, UUID friendshipId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Friendship friendship = getById(friendshipId);

        if (!friendship.getAddresseeId().equals(current.getLearnerId())) {
            throw new IllegalArgumentException("Only the addressee can decline this friend request.");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be declined.");
        }

        friendship.setStatus(FriendshipStatus.DECLINED);
        friendship.setRespondedAt(LocalDateTime.now());
        friendship.setUpdatedAt(LocalDateTime.now());
        Friendship saved = friendshipRepository.save(friendship);
        return toRequestDto(saved);
    }

    @Transactional
    public void cancelOutgoingRequest(UUID requesterSupabaseUserId, UUID friendshipId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Friendship friendship = getById(friendshipId);

        if (!friendship.getRequesterId().equals(current.getLearnerId())) {
            throw new IllegalArgumentException("Only the requester can cancel this friend request.");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be canceled.");
        }

        friendship.setStatus(FriendshipStatus.CANCELED);
        friendship.setRespondedAt(LocalDateTime.now());
        friendship.setUpdatedAt(LocalDateTime.now());
        friendshipRepository.save(friendship);
    }

    public List<FriendUserSummaryDto> listFriends(UUID requesterSupabaseUserId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);

        List<Friendship> accepted = friendshipRepository.findAcceptedForLearner(current.getLearnerId());
        if (accepted.isEmpty()) {
            return List.of();
        }

        Set<UUID> friendIds = accepted.stream()
                .map(f -> f.getRequesterId().equals(current.getLearnerId()) ? f.getAddresseeId() : f.getRequesterId())
                .collect(Collectors.toSet());

        Map<UUID, Learner> friendMap = learnerRepository.findAllById(friendIds).stream()
                .collect(Collectors.toMap(Learner::getLearnerId, Function.identity()));

        return friendIds.stream()
                .map(friendMap::get)
                .filter(learner -> learner != null && Boolean.TRUE.equals(learner.getIs_active()))
                .map(this::toUserSummary)
                .sorted(Comparator.comparing(dto -> dto.username().toLowerCase()))
                .toList();
    }

    @Transactional
    public void removeFriend(UUID requesterSupabaseUserId, UUID friendLearnerId) throws ResourceNotFoundException {
        Learner current = requireActiveLearnerBySupabaseUserId(requesterSupabaseUserId);
        Friendship friendship = friendshipRepository.findBetween(current.getLearnerId(), friendLearnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship", "friendLearnerId", friendLearnerId));

        if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new IllegalStateException("You can only remove accepted friendships.");
        }

        friendship.setStatus(FriendshipStatus.CANCELED);
        friendship.setRespondedAt(LocalDateTime.now());
        friendship.setUpdatedAt(LocalDateTime.now());
        friendshipRepository.save(friendship);
    }

    private FriendRequestDto handleExistingForSend(
            Friendship friendship,
            UUID requesterId,
            UUID targetId,
            Learner requester,
            Learner target
    ) {
        switch (friendship.getStatus()) {
            case ACCEPTED -> throw new IllegalStateException("You are already friends.");
            case PENDING -> {
                if (requesterId.equals(friendship.getRequesterId())) {
                    throw new IllegalStateException("Friend request already sent.");
                }
                throw new IllegalStateException("This user already sent you a friend request.");
            }
            case DECLINED, CANCELED -> {
                friendship.setRequesterId(requesterId);
                friendship.setAddresseeId(targetId);
                friendship.setStatus(FriendshipStatus.PENDING);
                friendship.setRespondedAt(null);
                friendship.setUpdatedAt(LocalDateTime.now());
                Friendship saved = friendshipRepository.save(friendship);
                return toRequestDto(saved, requester, target);
            }
            default -> throw new IllegalStateException("Unsupported friendship status.");
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

    private Friendship getById(UUID friendshipId) throws ResourceNotFoundException {
        return friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship", "id", friendshipId));
    }

    private String normalizeQuery(String query) {
        String normalized = String.valueOf(query == null ? "" : query).trim();
        if (normalized.length() < 2) {
            throw new IllegalArgumentException("Search query must be at least 2 characters.");
        }
        return normalized;
    }

    private int normalizeLimit(Integer limit) {
        int requested = limit == null ? 8 : limit;
        return Math.max(1, Math.min(20, requested));
    }

    private Map<UUID, Friendship> getRelationshipMap(UUID currentLearnerId, Collection<UUID> targetIds) {
        if (targetIds == null || targetIds.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Friendship> relationships = friendshipRepository.findRelationships(currentLearnerId, targetIds);
        return relationships.stream().collect(Collectors.toMap(
                f -> f.getRequesterId().equals(currentLearnerId) ? f.getAddresseeId() : f.getRequesterId(),
                Function.identity(),
                (a, b) -> a
        ));
    }

    private String resolveRelationship(UUID currentLearnerId, Friendship friendship) {
        if (friendship == null) {
            return "NONE";
        }
        if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
            return "FRIEND";
        }
        if (friendship.getStatus() == FriendshipStatus.PENDING) {
            return friendship.getRequesterId().equals(currentLearnerId) ? "PENDING_OUT" : "PENDING_IN";
        }
        return "NONE";
    }

    private List<FriendRequestDto> mapRequests(List<Friendship> requests) {
        Set<UUID> ids = requests.stream()
                .flatMap(f -> java.util.stream.Stream.of(f.getRequesterId(), f.getAddresseeId()))
                .collect(Collectors.toSet());
        Map<UUID, Learner> learnerMap = learnerRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Learner::getLearnerId, Function.identity()));

        return requests.stream()
                .map(f -> toRequestDto(f, learnerMap.get(f.getRequesterId()), learnerMap.get(f.getAddresseeId())))
                .toList();
    }

    private FriendRequestDto toRequestDto(Friendship friendship) {
        Map<UUID, Learner> learnerMap = learnerRepository.findAllById(
                List.of(friendship.getRequesterId(), friendship.getAddresseeId())
        ).stream().collect(Collectors.toMap(Learner::getLearnerId, Function.identity()));
        return toRequestDto(friendship, learnerMap.get(friendship.getRequesterId()), learnerMap.get(friendship.getAddresseeId()));
    }

    private FriendRequestDto toRequestDto(Friendship friendship, Learner requester, Learner addressee) {
        return new FriendRequestDto(
                friendship.getFriendshipId(),
                toUserSummary(requester),
                toUserSummary(addressee),
                friendship.getStatus().name(),
                friendship.getCreatedAt()
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
}

