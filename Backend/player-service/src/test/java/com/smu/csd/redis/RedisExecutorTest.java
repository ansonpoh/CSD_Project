package com.smu.csd.redis;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RedisExecutorTest {

    private final RedisExecutor redisExecutor = new RedisExecutor();

    @Mock
    private Supplier<String> supplier;

    @Mock
    private Supplier<String> fallback;

    @Test
    void execute_returnsSupplierResult_whenNoException() {
        when(supplier.get()).thenReturn("ok");

        String result = redisExecutor.execute("leaderboard.read", supplier, fallback);

        assertEquals("ok", result);
        verify(fallback, never()).get();
    }

    @Test
    void execute_usesFallback_whenSupplierThrows() {
        when(supplier.get()).thenThrow(new RuntimeException("redis down"));
        when(fallback.get()).thenReturn("from-db");

        String result = redisExecutor.execute("leaderboard.read", supplier, fallback);

        assertEquals("from-db", result);
        verify(fallback).get();
    }

    @Test
    void run_swallowsRuntimeExceptions() {
        assertDoesNotThrow(() -> redisExecutor.run("leaderboard.write", () -> {
            throw new RuntimeException("redis down");
        }));
    }

    @Test
    void tryRun_returnsTrue_whenActionSucceeds() {
        boolean success = redisExecutor.tryRun("leaderboard.write", () -> {
        });

        assertTrue(success);
    }

    @Test
    void tryRun_returnsFalse_whenActionThrows() {
        boolean success = redisExecutor.tryRun("leaderboard.write", () -> {
            throw new RuntimeException("redis down");
        });

        assertFalse(success);
    }

    @Test
    void isAvailable_returnsTrue_whenProbeSucceeds() {
        assertTrue(redisExecutor.isAvailable("leaderboard.probe", () -> {
        }));
    }

    @Test
    void isAvailable_returnsFalse_whenProbeThrows() {
        assertFalse(redisExecutor.isAvailable("leaderboard.probe", () -> {
            throw new RuntimeException("redis down");
        }));
    }

    @Test
    void requireAvailable_doesNotThrow_whenProbeSucceeds() {
        assertDoesNotThrow(() -> redisExecutor.requireAvailable("leaderboard.probe", () -> {
        }));
    }

    @Test
    void requireAvailable_throwsIllegalState_whenProbeFails() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> redisExecutor.requireAvailable("leaderboard.probe", () -> {
                    throw new RuntimeException("redis down");
                }));

        assertEquals(
                "Redis-backed leaderboard.probe is currently unavailable. Start Redis and try again.",
                ex.getMessage());
    }

    @Test
    void unavailable_buildsConsistentMessage() {
        IllegalStateException ex = redisExecutor.unavailable("leaderboard.write");

        assertEquals(
                "Redis-backed leaderboard.write is currently unavailable. Start Redis and try again.",
                ex.getMessage());
    }
}
