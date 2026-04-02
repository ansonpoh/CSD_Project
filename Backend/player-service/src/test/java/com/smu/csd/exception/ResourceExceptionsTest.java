package com.smu.csd.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ResourceExceptionsTest {

    @Test
    void resourceNotFoundException_formatsMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Learner", "id", 123);

        assertEquals("Learner not found with id: 123", ex.getMessage());
    }

    @Test
    void resourceAlreadyExistsException_formatsMessageFromResourceFieldAndValue() {
        ResourceAlreadyExistsException ex = new ResourceAlreadyExistsException("Learner", "email", "alice@example.com");

        assertEquals("Learner already exists with email: alice@example.com", ex.getMessage());
    }

    @Test
    void resourceAlreadyExistsException_keepsProvidedMessage() {
        ResourceAlreadyExistsException ex = new ResourceAlreadyExistsException("Email is already in use.");

        assertEquals("Email is already in use.", ex.getMessage());
    }
}
