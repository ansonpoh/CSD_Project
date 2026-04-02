package com.smu.csd.friendship;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
import org.springframework.data.domain.PageRequest;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

    @Mock
    private FriendshipRepository friendshipRepository;
    @Mock
    private LearnerRepository learnerRepository;

    @InjectMocks
    private FriendshipService friendshipService;

    private UUID requesterSupabaseUserId;
    private UUID requesterLearnerId;

    @BeforeEach
    void setUp() {
        requesterSupabaseUserId = UUID.randomUUID();
        requesterLearnerId = UUID.randomUUID();
    }

    @Test
    void searchByUsername_rejectsQueryShorterThanTwoCharacters() {
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> friendshipService.searchByUsername(requesterSupabaseUserId, " a ", 5));

        assertEquals("Search query must be at least 2 characters.", ex.getMessage());
    }

    @Test
    void searchByUsername_clampsLimitToMaxTwenty() throws ResourceNotFoundException {
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Learner candidate = activeLearner(UUID.randomUUID(), UUID.randomUUID(), "targetUser");

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.searchActiveByUsernamePrefix(any(), any(), any(PageRequest.class)))
                .thenReturn(List.of(candidate));
        when(friendshipRepository.findRelationships(any(), any())).thenReturn(List.of());

        friendshipService.searchByUsername(requesterSupabaseUserId, "ta", 99);

        ArgumentCaptor<PageRequest> pageableCaptor = ArgumentCaptor.forClass(PageRequest.class);
        verify(learnerRepository).searchActiveByUsernamePrefix(any(), any(), pageableCaptor.capture());
        assertEquals(20, pageableCaptor.getValue().getPageSize());
    }

    @Test
    void searchByUsername_mapsRelationshipStatuses() throws ResourceNotFoundException {
        UUID acceptedId = UUID.randomUUID();
        UUID pendingOutId = UUID.randomUUID();
        UUID pendingInId = UUID.randomUUID();
        UUID noneId = UUID.randomUUID();

        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Learner accepted = activeLearner(acceptedId, UUID.randomUUID(), "acceptedFriend");
        Learner pendingOut = activeLearner(pendingOutId, UUID.randomUUID(), "pendingOut");
        Learner pendingIn = activeLearner(pendingInId, UUID.randomUUID(), "pendingIn");
        Learner none = activeLearner(noneId, UUID.randomUUID(), "none");

        Friendship acceptedFriendship = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(acceptedId)
                .status(FriendshipStatus.ACCEPTED)
                .build();
        Friendship pendingOutFriendship = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(pendingOutId)
                .status(FriendshipStatus.PENDING)
                .build();
        Friendship pendingInFriendship = Friendship.builder()
                .requesterId(pendingInId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.searchActiveByUsernamePrefix(any(), any(), any(PageRequest.class)))
                .thenReturn(List.of(accepted, pendingOut, pendingIn, none));
        when(friendshipRepository.findRelationships(any(), any()))
                .thenReturn(List.of(acceptedFriendship, pendingOutFriendship, pendingInFriendship));

        List<FriendSearchResultDto> results = friendshipService.searchByUsername(requesterSupabaseUserId, "pe", 10);

        assertEquals(4, results.size());
        assertEquals("FRIEND", relationshipFor(results, acceptedId));
        assertEquals("PENDING_OUT", relationshipFor(results, pendingOutId));
        assertEquals("PENDING_IN", relationshipFor(results, pendingInId));
        assertEquals("NONE", relationshipFor(results, noneId));
    }

    @Test
    void sendRequest_throwsWhenRequesterTargetsSelf() {
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.findById(requesterLearnerId)).thenReturn(Optional.of(requester));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> friendshipService.sendRequest(requesterSupabaseUserId, requesterLearnerId));

        assertEquals("You cannot send a friend request to yourself.", ex.getMessage());
    }

    @Test
    void sendRequest_reopensDeclinedFriendshipAsPending() throws ResourceNotFoundException {
        UUID targetLearnerId = UUID.randomUUID();
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Learner target = activeLearner(targetLearnerId, UUID.randomUUID(), "target");

        Friendship existing = Friendship.builder()
                .requesterId(targetLearnerId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.DECLINED)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.findById(targetLearnerId)).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requesterLearnerId, targetLearnerId)).thenReturn(Optional.of(existing));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FriendRequestDto dto = friendshipService.sendRequest(requesterSupabaseUserId, targetLearnerId);

        assertEquals("PENDING", dto.status());
        assertEquals(requesterLearnerId, dto.requester().learnerId());
        assertEquals(targetLearnerId, dto.addressee().learnerId());
        assertFalse(dto.requester().username().isBlank());

        ArgumentCaptor<Friendship> friendshipCaptor = ArgumentCaptor.forClass(Friendship.class);
        verify(friendshipRepository).save(friendshipCaptor.capture());
        assertEquals(FriendshipStatus.PENDING, friendshipCaptor.getValue().getStatus());
        assertEquals(requesterLearnerId, friendshipCaptor.getValue().getRequesterId());
        assertEquals(targetLearnerId, friendshipCaptor.getValue().getAddresseeId());
    }

    @Test
    void sendRequest_throwsWhenAlreadyFriends() {
        UUID targetLearnerId = UUID.randomUUID();
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Learner target = activeLearner(targetLearnerId, UUID.randomUUID(), "target");

        Friendship existing = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(targetLearnerId)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.findById(targetLearnerId)).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requesterLearnerId, targetLearnerId)).thenReturn(Optional.of(existing));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> friendshipService.sendRequest(requesterSupabaseUserId, targetLearnerId));

        assertEquals("You are already friends.", ex.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void sendRequest_throwsWhenPendingAlreadySentByRequester() {
        UUID targetLearnerId = UUID.randomUUID();
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Learner target = activeLearner(targetLearnerId, UUID.randomUUID(), "target");

        Friendship existing = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(targetLearnerId)
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.findById(targetLearnerId)).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requesterLearnerId, targetLearnerId)).thenReturn(Optional.of(existing));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> friendshipService.sendRequest(requesterSupabaseUserId, targetLearnerId));

        assertEquals("Friend request already sent.", ex.getMessage());
    }

    @Test
    void sendRequest_throwsWhenPendingWasSentByTarget() {
        UUID targetLearnerId = UUID.randomUUID();
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Learner target = activeLearner(targetLearnerId, UUID.randomUUID(), "target");

        Friendship existing = Friendship.builder()
                .requesterId(targetLearnerId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(learnerRepository.findById(targetLearnerId)).thenReturn(Optional.of(target));
        when(friendshipRepository.findBetween(requesterLearnerId, targetLearnerId)).thenReturn(Optional.of(existing));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> friendshipService.sendRequest(requesterSupabaseUserId, targetLearnerId));

        assertEquals("This user already sent you a friend request.", ex.getMessage());
    }

    @Test
    void acceptRequest_updatesPendingRequestWhenCurrentUserIsAddressee() throws ResourceNotFoundException {
        UUID friendshipId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Learner requester = activeLearner(requesterId, UUID.randomUUID(), "requester");

        Friendship pending = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(requesterId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.PENDING)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(pending));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(learnerRepository.findAllById(any())).thenReturn(List.of(requester, current));

        FriendRequestDto dto = friendshipService.acceptRequest(requesterSupabaseUserId, friendshipId);

        assertEquals("ACCEPTED", dto.status());
        assertEquals(requesterId, dto.requester().learnerId());
        assertEquals(requesterLearnerId, dto.addressee().learnerId());
        assertEquals(FriendshipStatus.ACCEPTED, pending.getStatus());
        assertNotNull(pending.getRespondedAt());
        assertNotNull(pending.getUpdatedAt());
    }

    @Test
    void acceptRequest_rejectsWhenCurrentUserIsNotAddressee() {
        UUID friendshipId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Friendship pending = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(requesterLearnerId)
                .addresseeId(UUID.randomUUID())
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(pending));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> friendshipService.acceptRequest(requesterSupabaseUserId, friendshipId));
        assertEquals("Only the addressee can accept this friend request.", ex.getMessage());
    }

    @Test
    void declineRequest_rejectsWhenStatusIsNotPending() {
        UUID friendshipId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Friendship accepted = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(UUID.randomUUID())
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(accepted));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> friendshipService.declineRequest(requesterSupabaseUserId, friendshipId));
        assertEquals("Only pending requests can be declined.", ex.getMessage());
    }

    @Test
    void declineRequest_updatesPendingRequestWhenCurrentUserIsAddressee() throws ResourceNotFoundException {
        UUID friendshipId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Learner requester = activeLearner(requesterId, UUID.randomUUID(), "requester");

        Friendship pending = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(requesterId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.PENDING)
                .createdAt(LocalDateTime.now().minusHours(3))
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(pending));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(learnerRepository.findAllById(any())).thenReturn(List.of(requester, current));

        FriendRequestDto dto = friendshipService.declineRequest(requesterSupabaseUserId, friendshipId);

        assertEquals("DECLINED", dto.status());
        assertEquals(FriendshipStatus.DECLINED, pending.getStatus());
        assertNotNull(pending.getRespondedAt());
        assertNotNull(pending.getUpdatedAt());
    }

    @Test
    void cancelOutgoingRequest_rejectsWhenCurrentUserIsNotRequester() {
        UUID friendshipId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Friendship pending = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(UUID.randomUUID())
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(pending));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> friendshipService.cancelOutgoingRequest(requesterSupabaseUserId, friendshipId));
        assertEquals("Only the requester can cancel this friend request.", ex.getMessage());
    }

    @Test
    void cancelOutgoingRequest_marksPendingRequestAsCanceled() throws ResourceNotFoundException {
        UUID friendshipId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Friendship pending = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(requesterLearnerId)
                .addresseeId(targetId)
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(pending));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendshipService.cancelOutgoingRequest(requesterSupabaseUserId, friendshipId);

        assertEquals(FriendshipStatus.CANCELED, pending.getStatus());
        assertNotNull(pending.getRespondedAt());
        assertNotNull(pending.getUpdatedAt());
        verify(friendshipRepository).save(pending);
    }

    @Test
    void listFriends_filtersInactiveAndSortsByUsernameCaseInsensitive() throws ResourceNotFoundException {
        UUID friendAId = UUID.randomUUID();
        UUID friendBId = UUID.randomUUID();
        UUID inactiveId = UUID.randomUUID();

        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");
        Friendship acceptedA = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(friendAId)
                .status(FriendshipStatus.ACCEPTED)
                .build();
        Friendship acceptedB = Friendship.builder()
                .requesterId(friendBId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.ACCEPTED)
                .build();
        Friendship acceptedInactive = Friendship.builder()
                .requesterId(inactiveId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        Learner friendA = activeLearner(friendAId, UUID.randomUUID(), "zebra");
        Learner friendB = activeLearner(friendBId, UUID.randomUUID(), "Alpha");
        Learner inactive = activeLearner(inactiveId, UUID.randomUUID(), "ghost");
        inactive.setIs_active(false);

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findAcceptedForLearner(requesterLearnerId))
                .thenReturn(List.of(acceptedA, acceptedB, acceptedInactive));
        when(learnerRepository.findAllById(any())).thenReturn(List.of(friendA, friendB, inactive));

        List<FriendUserSummaryDto> friends = friendshipService.listFriends(requesterSupabaseUserId);

        assertEquals(2, friends.size());
        assertEquals("Alpha", friends.get(0).username());
        assertEquals("zebra", friends.get(1).username());
        assertTrue(friends.stream().noneMatch(f -> "ghost".equals(f.username())));
    }

    @Test
    void getIncomingRequests_mapsMissingLearnersToUnknownUser() throws ResourceNotFoundException {
        UUID requesterId = UUID.randomUUID();
        UUID friendshipId = UUID.randomUUID();
        Learner current = activeLearner(requesterLearnerId, requesterSupabaseUserId, "current");

        Friendship pending = Friendship.builder()
                .friendshipId(friendshipId)
                .requesterId(requesterId)
                .addresseeId(requesterLearnerId)
                .status(FriendshipStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(current);
        when(friendshipRepository.findByAddresseeIdAndStatusOrderByCreatedAtDesc(requesterLearnerId, FriendshipStatus.PENDING))
                .thenReturn(List.of(pending));
        when(learnerRepository.findAllById(any())).thenReturn(List.of(current));

        List<FriendRequestDto> dtos = friendshipService.getIncomingRequests(requesterSupabaseUserId);

        assertEquals(1, dtos.size());
        assertEquals("Unknown", dtos.get(0).requester().username());
        assertEquals(requesterLearnerId, dtos.get(0).addressee().learnerId());
    }

    @Test
    void removeFriend_rejectsNonAcceptedFriendship() {
        UUID friendId = UUID.randomUUID();
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Friendship pending = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(friendId)
                .status(FriendshipStatus.PENDING)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(friendshipRepository.findBetween(requesterLearnerId, friendId)).thenReturn(Optional.of(pending));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> friendshipService.removeFriend(requesterSupabaseUserId, friendId));

        assertEquals("You can only remove accepted friendships.", ex.getMessage());
        verify(friendshipRepository, never()).save(any(Friendship.class));
    }

    @Test
    void removeFriend_marksAcceptedFriendshipAsCanceled() throws ResourceNotFoundException {
        UUID friendId = UUID.randomUUID();
        Learner requester = activeLearner(requesterLearnerId, requesterSupabaseUserId, "requester");
        Friendship accepted = Friendship.builder()
                .requesterId(requesterLearnerId)
                .addresseeId(friendId)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(learnerRepository.findBySupabaseUserId(requesterSupabaseUserId)).thenReturn(requester);
        when(friendshipRepository.findBetween(requesterLearnerId, friendId)).thenReturn(Optional.of(accepted));
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendshipService.removeFriend(requesterSupabaseUserId, friendId);

        assertEquals(FriendshipStatus.CANCELED, accepted.getStatus());
        assertNotNull(accepted.getRespondedAt());
        assertNotNull(accepted.getUpdatedAt());
        verify(friendshipRepository).save(accepted);
    }

    private String relationshipFor(List<FriendSearchResultDto> results, UUID learnerId) {
        return results.stream()
                .filter(result -> learnerId.equals(result.learnerId()))
                .findFirst()
                .orElseThrow()
                .relationship();
    }

    private static Learner activeLearner(UUID learnerId, UUID supabaseId, String username) {
        return Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseId)
                .username(username)
                .email(username + "@example.com")
                .level(1)
                .is_active(true)
                .build();
    }
}
