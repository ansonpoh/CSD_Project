package com.smu.csd.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

class ErrorResponseTest {

    @Test
    void constructor_setsStatusMessageAndCurrentTimestamp() {
        LocalDateTime before = LocalDateTime.now();

        ErrorResponse response = new ErrorResponse(400, "Bad request");

        LocalDateTime after = LocalDateTime.now();

        assertEquals(400, response.getStatus());
        assertEquals("Bad request", response.getMessage());
        assertNotNull(response.getTimestamp());
        assertFalse(response.getTimestamp().isBefore(before));
        assertFalse(response.getTimestamp().isAfter(after));
    }
}
