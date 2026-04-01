package com.smu.csd.contents.topics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

public class TopicServiceUnitTest {

    private TopicRepository topicRepository;
    private TopicService topicService;

    @BeforeEach
    void setUp() {
        topicRepository = mock(TopicRepository.class);
        topicService = new TopicService(topicRepository);
    }

    @Test
    void createTopic_ThrowsWhenTopicNameAlreadyExists() {
        when(topicRepository.existsByTopicName("Java Basics")).thenReturn(true);

        ResourceAlreadyExistsException exception = assertThrows(
                ResourceAlreadyExistsException.class,
                () -> topicService.createTopic("Java Basics", "Foundations")
        );

        assertTrue(exception.getMessage().contains("Java Basics"));
    }

    @Test
    void updateTopic_UpdatesOnlyProvidedFields() throws ResourceNotFoundException, ResourceAlreadyExistsException {
        UUID topicId = UUID.randomUUID();
        Topic existing = Topic.builder()
                .topicId(topicId)
                .topicName("Old Name")
                .description("Old Description")
                .build();

        when(topicRepository.findById(topicId)).thenReturn(java.util.Optional.of(existing));
        when(topicRepository.save(any(Topic.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Topic updated = topicService.updateTopic(topicId, null, "New Description");

        assertEquals("Old Name", updated.getTopicName());
        assertEquals("New Description", updated.getDescription());
        verify(topicRepository).save(existing);
    }
}
