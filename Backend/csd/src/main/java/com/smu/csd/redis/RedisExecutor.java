package com.smu.csd.redis;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisExecutor {
    private static final Logger log = LoggerFactory.getLogger(RedisExecutor.class);

    private final Set<String> warnedOperations = ConcurrentHashMap.newKeySet();

    public <T> T execute(String operation, Supplier<T> supplier, Supplier<T> fallback) {
        try {
            return supplier.get();
        } catch (RuntimeException ex) {
            warn(operation, ex);
            return fallback.get();
        }
    }

    public void run(String operation, Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            warn(operation, ex);
        }
    }

    public boolean tryRun(String operation, Runnable action) {
        try {
            action.run();
            return true;
        } catch (RuntimeException ex) {
            warn(operation, ex);
            return false;
        }
    }

    public boolean isAvailable(String operation, Runnable probe) {
        try {
            probe.run();
            return true;
        } catch (RuntimeException ex) {
            warn(operation, ex);
            return false;
        }
    }

    public void requireAvailable(String operation, Runnable probe) {
        if (!isAvailable(operation, probe)) {
            throw unavailable(operation);
        }
    }

    public IllegalStateException unavailable(String operation) {
        return new IllegalStateException(
            "Redis-backed " + operation + " is currently unavailable. Start Redis and try again."
        );
    }

    private void warn(String operation, RuntimeException ex) {
        if (warnedOperations.add(operation)) {
            log.warn("Redis unavailable during {}. Falling back where possible. {}", operation, ex.getMessage());
            return;
        }
        log.debug("Redis unavailable during {}", operation, ex);
    }
}
