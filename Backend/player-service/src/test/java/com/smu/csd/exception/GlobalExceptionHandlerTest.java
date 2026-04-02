package com.smu.csd.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handleResourceNotFoundException_returnsNotFoundPayload() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Learner", "id", 42);

        ResponseEntity<ErrorResponse> response = handler.handleResourceNotFoundException(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.NOT_FOUND.value(), response.getBody().getStatus());
        assertEquals("Learner not found with id: 42", response.getBody().getMessage());
        assertNotNull(response.getBody().getTimestamp());
    }

    @Test
    void handleResourceAlreadyExistsException_returnsConflictPayload() {
        ResourceAlreadyExistsException ex = new ResourceAlreadyExistsException("Email is already in use.");

        ResponseEntity<ErrorResponse> response = handler.handleResourceAlreadyExistsException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().getStatus());
        assertEquals("Email is already in use.", response.getBody().getMessage());
    }

    @Test
    void handleIllegalArgumentException_returnsBadRequestPayload() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input");

        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgumentException(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getBody().getStatus());
        assertEquals("Invalid input", response.getBody().getMessage());
    }

    @Test
    void handleIllegalStateException_returnsConflictPayload() {
        IllegalStateException ex = new IllegalStateException("Invalid state");

        ResponseEntity<ErrorResponse> response = handler.handleIllegalStateException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().getStatus());
        assertEquals("Invalid state", response.getBody().getMessage());
    }

    @Test
    void handleDataIntegrityViolationException_normalizesUsernameMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "constraint violation",
                new RuntimeException("duplicate key value violates unique constraint on username"));

        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().getStatus());
        assertEquals("Username is already in use.", response.getBody().getMessage());
    }

    @Test
    void handleDataIntegrityViolationException_normalizesEmailMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "constraint violation",
                new RuntimeException("duplicate key value violates unique constraint on EMAIL"));

        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().getStatus());
        assertEquals("Email is already in use.", response.getBody().getMessage());
    }

    @Test
    void handleDataIntegrityViolationException_fallsBackToGenericDuplicateMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "constraint violation",
                new RuntimeException("duplicate key value violates unique constraint"));

        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().getStatus());
        assertEquals("Resource already exists.", response.getBody().getMessage());
    }

    @Test
    void handleDataIntegrityViolationException_handlesNullMostSpecificCauseMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException((String) null);

        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().getStatus());
        assertEquals("Resource already exists.", response.getBody().getMessage());
    }

    @Test
    void handleGenericException_returnsInternalServerErrorPayload() {
        Exception ex = new Exception("boom");

        ResponseEntity<ErrorResponse> response = handler.handleGenericException(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), response.getBody().getStatus());
        assertEquals("An unexpected error occurred: boom", response.getBody().getMessage());
    }
}
