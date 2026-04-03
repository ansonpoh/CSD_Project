package com.smu.csd;

import org.mockito.Mockito;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;

@TestConfiguration
@Profile("test")
public class TestAiConfig {

    @Bean
    public ChatModel chatModel() {
        return Mockito.mock(ChatModel.class);
    }

    @Bean
    public VectorStore vectorStore() {
        return Mockito.mock(VectorStore.class);
    }
}
