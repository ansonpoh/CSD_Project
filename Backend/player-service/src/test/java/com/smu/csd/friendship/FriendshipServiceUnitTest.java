package com.smu.csd.friendship;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

public class FriendshipServiceUnitTest {

    private FriendshipRepository friendshipRepository;
    private LearnerRepository learnerRepository;
    private FriendshipService service;

    @BeforeEach
    void setUp() {
        friendshipRepository = mock(FriendshipRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        service = new FriendshipService(friendshipRepository, learnerRepository);
    }

    @Test
    void searchByUsername_RejectsQueryShorterThanTwoCharacters() {
        UUID supabaseUserId = UUID.randomUUID();
        stubCurrentLearner(supabaseUserId);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.searchByUsername(supabaseUserId, "a", 5)
        );

        assertEquals("Search query must be at least 2 characters.", exception.getMessage());
        verify(learnerRepository, never()).searchActiveByUsernamePrefix(anyString(), any(), any());
    }

    @Test
    void searchByUsername_ReturnsEmptyListWhenNoCandidatesExist() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.searchActiveByUsernamePrefix(eq("al"), eq(current.getLearnerId()), any()))
                .thenReturn(List.of());

        List<FriendSearchResultDto> result = service.searchByUsername(supabaseUserId, "al", 10);

        assertTrue(result.isEmpty());
    }

    @Test
    void searchByUsername_ResolvesNoneRelationshipWhenNoFriendshipExists() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner target = learner(UUID.randomUUID(), "target");
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.searchActiveByUsernamePrefix(eq("ta"), eq(current.getLearnerId()), any()))
                .thenReturn(List.of(target));
        when(friendshipRepository.findRelationships(eq(current.getLearnerId()), anyCollection())).thenReturn(List.of());

        List<FriendSearchResultDto> result = service.searchByUsername(supabaseUserId, "ta", 10);

        assertEquals(1, result.size());
        assertEquals("NONE", result.get(0).relationship());
    }

    @Test
    void sendRequest_RejectsSelfRequest() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
        when(learnerRepository.findById(current.getLearnerId())).thenReturn(Optional.of(current));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.sendRequest(supabaseUserId, current.getLearnerId())
        );

        assertEquals("You cannot send a friend request to yourself.", exception.getMessage());
    }

    @Test
    void sendRequest_CreatesPendingRequestWhenNoPriorFriendshipExists() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner requester = learner(UUID.randomUUID(), "requester");
        Learner target = learner(UUID.randomUUID(), "target");
        Friendship saved = friendship(UUID.randomUUID(), requester.getLearnerId(), target.getLearnerId(), FriendshipStatus.PENDING);

        stubCurrentLearner(supabaseUserId, requester);
        when(learnerRepository.findById(target.getLearnerId())).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requester.getLearnerId(), target.getLearnerId())).thenReturn(Optional.empty());
        when(friendshipRepository.save(any(Friendship.class))).thenReturn(saved);
        stubRequestSummaries(requester, target);

        FriendRequestDto result = service.sendRequest(supabaseUserId, target.getLearnerId());

        assertEquals(saved.getFriendshipId(), result.friendshipId());
        assertEquals("PENDING", result.status());
        verify(friendshipRepository).save(any(Friendship.class));
    }

    @Test
    void sendRequest_RejectsWhenFriendshipAlreadyAccepted() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner requester = learner(UUID.randomUUID(), "requester");
        Learner target = learner(UUID.randomUUID(), "target");
        Friendship existing = friendship(UUID.randomUUID(), requester.getLearnerId(), target.getLearnerId(), FriendshipStatus.ACCEPTED);

        stubCurrentLearner(supabaseUserId, requester);
        when(learnerRepository.findById(target.getLearnerId())).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requester.getLearnerId(), target.getLearnerId())).thenReturn(Optional.of(existing));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.sendRequest(supabaseUserId, target.getLearnerId())
        );

        assertEquals("You are already friends.", exception.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void sendRequest_RejectsDuplicateOutgoingPendingRequest() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner requester = learner(UUID.randomUUID(), "requester");
        Learner target = learner(UUID.randomUUID(), "target");
        Friendship existing = friendship(UUID.randomUUID(), requester.getLearnerId(), target.getLearnerId(), FriendshipStatus.PENDING);

        stubCurrentLearner(supabaseUserId, requester);
        when(learnerRepository.findById(target.getLearnerId())).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requester.getLearnerId(), target.getLearnerId())).thenReturn(Optional.of(existing));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.sendRequest(supabaseUserId, target.getLearnerId())
        );

        assertEquals("Friend request already sent.", exception.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void sendRequest_RejectsIncomingPendingRequestFromTarget() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner requester = learner(UUID.randomUUID(), "requester");
        Learner target = learner(UUID.randomUUID(), "target");
        Friendship existing = friendship(UUID.randomUUID(), target.getLearnerId(), requester.getLearnerId(), FriendshipStatus.PENDING);

        stubCurrentLearner(supabaseUserId, requester);
        when(learnerRepository.findById(target.getLearnerId())).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requester.getLearnerId(), target.getLearnerId())).thenReturn(Optional.of(existing));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.sendRequest(supabaseUserId, target.getLearnerId())
        );

        assertEquals("This user already sent you a friend request.", exception.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void sendRequest_ReopensDeclinedFriendshipIntoNewPendingRequest() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner requester = learner(UUID.randomUUID(), "requester");
        Learner target = learner(UUID.randomUUID(), "target");
        Friendship existing = friendship(UUID.randomUUID(), target.getLearnerId(), requester.getLearnerId(), FriendshipStatus.DECLINED);

        stubCurrentLearner(supabaseUserId, requester);
        when(learnerRepository.findById(target.getLearnerId())).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requester.getLearnerId(), target.getLearnerId())).thenReturn(Optional.of(existing));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));
        stubRequestSummaries(requester, target);

        FriendRequestDto result = service.sendRequest(supabaseUserId, target.getLearnerId());

        assertEquals("PENDING", result.status());
        verify(friendshipRepository).save(any(Friendship.class));
    }

    @Test
    void acceptRequest_RejectsNonAddresseeUser() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner requester = learner(UUID.randomUUID(), "requester");
        Learner addressee = learner(UUID.randomUUID(), "addressee");
        Friendship friendship = friendship(UUID.randomUUID(), requester.getLearnerId(), addressee.getLearnerId(), FriendshipStatus.PENDING);

        stubCurrentLearner(supabaseUserId, current);
        when(friendshipRepository.findById(friendship.getFriendshipId())).thenReturn(Optional.of(friendship));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.acceptRequest(supabaseUserId, friendship.getFriendshipId())
        );

        assertEquals("Only the addressee can accept this friend request.", exception.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void acceptRequest_RejectsNonPendingFriendship() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner addressee = learner(UUID.randomUUID(), "addressee");
        Learner requester = learner(UUID.randomUUID(), "requester");
        Friendship friendship = friendship(UUID.randomUUID(), requester.getLearnerId(), addressee.getLearnerId(), FriendshipStatus.ACCEPTED);

        stubCurrentLearner(supabaseUserId, addressee);
        when(friendshipRepository.findById(friendship.getFriendshipId())).thenReturn(Optional.of(friendship));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.acceptRequest(supabaseUserId, friendship.getFriendshipId())
        );

        assertEquals("Only pending requests can be accepted.", exception.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void removeFriend_RejectsNonAcceptedFriendshipAndSucceedsForAcceptedOne() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner current = learner(UUID.randomUUID(), "current");
        Learner friend = learner(UUID.randomUUID(), "friend");
        Friendship pending = friendship(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId(), FriendshipStatus.PENDING);
        Friendship accepted = friendship(UUID.randomUUID(), current.getLearnerId(), friend.getLearnerId(), FriendshipStatus.ACCEPTED);

        stubCurrentLearner(supabaseUserId, current);
        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(pending));
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.removeFriend(supabaseUserId, friend.getLearnerId())
        );
        assertEquals("You can only remove accepted friendships.", exception.getMessage());

        when(friendshipRepository.findBetween(current.getLearnerId(), friend.getLearnerId())).thenReturn(Optional.of(accepted));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.removeFriend(supabaseUserId, friend.getLearnerId());

        verify(friendshipRepository).save(any(Friendship.class));
    }

    private void stubCurrentLearner(UUID supabaseUserId) {
        stubCurrentLearner(supabaseUserId, learner(UUID.randomUUID(), "current"));
    }

    private void stubCurrentLearner(UUID supabaseUserId, Learner current) {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(current);
    }

    private void stubRequestSummaries(Learner requester, Learner target) {
        when(learnerRepository.findAllById(anyCollection())).thenReturn(List.of(requester, target));
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

    private Friendship friendship(UUID friendshipId, UUID requesterId, UUID addresseeId, FriendshipStatus status) {
        return Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(requesterId)
                .addresseeId(addresseeId)
                .status(status)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
