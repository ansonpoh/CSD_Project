package com.smu.csd.friendship;

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

class FriendshipControllerUnitTest {

    private FriendshipController controller;
    private FriendshipService friendshipService;

    @BeforeEach
    void setUp() {
        friendshipService = mock(FriendshipService.class);
        controller = new FriendshipController(friendshipService);
    }

    @Test
    void searchByUsernameDelegatesToService() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        List<FriendSearchResultDto> expected = List.of(
                new FriendSearchResultDto(UUID.randomUUID(), "ranger", 5, true, "NONE")
        );
        when(friendshipService.searchByUsername(supabaseUserId, "ra", 10)).thenReturn(expected);

        ResponseEntity<List<FriendSearchResultDto>> response = controller.searchByUsername(authentication, "ra", 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(friendshipService).searchByUsername(supabaseUserId, "ra", 10);
    }

    @Test
    void sendFriendRequestRejectsNullRequest() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> controller.sendFriendRequest(authentication, null)
        );

        assertEquals("targetLearnerId is required.", exception.getMessage());
    }

    @Test
    void sendFriendRequestRejectsNullTargetLearnerId() {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> controller.sendFriendRequest(authentication, new FriendshipController.CreateFriendRequest(null))
        );

        assertEquals("targetLearnerId is required.", exception.getMessage());
    }

    @Test
    void sendFriendRequestReturnsCreated() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID targetLearnerId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        FriendRequestDto expected = new FriendRequestDto(
                UUID.randomUUID(),
                new FriendUserSummaryDto(UUID.randomUUID(), "requester", 2, true),
                new FriendUserSummaryDto(targetLearnerId, "addressee", 4, true),
                "PENDING",
                null
        );
        when(friendshipService.sendRequest(supabaseUserId, targetLearnerId)).thenReturn(expected);

        ResponseEntity<FriendRequestDto> response = controller.sendFriendRequest(
                authentication,
                new FriendshipController.CreateFriendRequest(targetLearnerId)
        );

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(friendshipService).sendRequest(supabaseUserId, targetLearnerId);
    }

    @Test
    void getIncomingRequestsDelegatesToService() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);
        List<FriendRequestDto> expected = List.of();
        when(friendshipService.getIncomingRequests(supabaseUserId)).thenReturn(expected);

        ResponseEntity<List<FriendRequestDto>> response = controller.getIncomingRequests(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(friendshipService).getIncomingRequests(supabaseUserId);
    }

    @Test
    void cancelOutgoingRequestReturnsNoContent() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID friendshipId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        ResponseEntity<Void> response = controller.cancelOutgoingRequest(authentication, friendshipId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(friendshipService).cancelOutgoingRequest(supabaseUserId, friendshipId);
    }

    @Test
    void removeFriendReturnsNoContent() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        UUID friendLearnerId = UUID.randomUUID();
        Authentication authentication = mockAuthentication(supabaseUserId);

        ResponseEntity<Void> response = controller.removeFriend(authentication, friendLearnerId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(friendshipService).removeFriend(supabaseUserId, friendLearnerId);
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
