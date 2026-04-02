package com.smu.csd.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ChatbotWarmupRunner {
    private static final Logger log = LoggerFactory.getLogger(ChatbotWarmupRunner.class);

    private final ChatbotClient chatbotClient;

    @Value("${chatbot.warmup.enabled:true}")
    private boolean enabled;

    @Value("${chatbot.warmup.initial-delay-ms:0}")
    private long initialDelayMs;

    @Value("${chatbot.warmup.retry-count:3}")
    private int retryCount;

    @Value("${chatbot.warmup.retry-delay-ms:2000}")
    private long retryDelayMs;

    public ChatbotWarmupRunner(ChatbotClient chatbotClient) {
        this.chatbotClient = chatbotClient;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!enabled) {
            return;
        }

        Thread warmupThread = new Thread(this::runWarmup, "chatbot-warmup");
        warmupThread.setDaemon(true);
        warmupThread.start();
    }

    private void runWarmup() {
        sleep(initialDelayMs);
        int attempts = Math.max(1, retryCount);
        for (int attempt = 1; attempt <= attempts; attempt++) {
            if (chatbotClient.warmup()) {
                log.info("Chatbot warm-up succeeded on attempt {}/{}", attempt, attempts);
                return;
            }

            if (attempt < attempts) {
                log.info("Chatbot warm-up retry {}/{} scheduled in {}ms", attempt, attempts, retryDelayMs);
                sleep(retryDelayMs);
            }
        }
        log.warn("Chatbot warm-up failed after {} attempts. First request may still be slower.", attempts);
    }

    private void sleep(long ms) {
        if (ms <= 0) {
            return;
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
