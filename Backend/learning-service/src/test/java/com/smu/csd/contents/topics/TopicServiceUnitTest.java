package com.smu.csd.contents.topics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
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
    void createTopic_SavesNewTopicWhenNameDoesNotExist() throws ResourceAlreadyExistsException {
        Topic saved = Topic.builder()
                .topicId(UUID.randomUUID())
                .topicName("Java Basics")
                .description("Foundations")
                .build();
        when(topicRepository.existsByTopicName("Java Basics")).thenReturn(false);
        when(topicRepository.save(any(Topic.class))).thenReturn(saved);

        Topic result = topicService.createTopic("Java Basics", "Foundations");

        assertEquals(saved.getTopicId(), result.getTopicId());
        assertEquals("Java Basics", result.getTopicName());
        verify(topicRepository).save(any(Topic.class));
    }

    @Test
    void getAllTopics_ReturnsRepositoryRows() {
        Topic first = Topic.builder().topicId(UUID.randomUUID()).topicName("A").description("A").build();
        Topic second = Topic.builder().topicId(UUID.randomUUID()).topicName("B").description("B").build();
        when(topicRepository.findAll()).thenReturn(List.of(first, second));

        List<Topic> result = topicService.getAllTopics();

        assertEquals(2, result.size());
        assertEquals(first.getTopicId(), result.get(0).getTopicId());
    }

    @Test
    void getById_ThrowsWhenTopicMissing() {
        UUID topicId = UUID.randomUUID();
        when(topicRepository.findById(topicId)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> topicService.getById(topicId)
        );

        assertTrue(exception.getMessage().contains(topicId.toString()));
    }

    @Test
    void getByTopicName_ReturnsTopicWhenFound() throws ResourceNotFoundException {
        Topic topic = Topic.builder()
                .topicId(UUID.randomUUID())
                .topicName("Security")
                .description("Basics")
                .build();
        when(topicRepository.findByTopicName("Security")).thenReturn(Optional.of(topic));

        Topic result = topicService.getByTopicName("Security");

        assertEquals(topic.getTopicId(), result.getTopicId());
    }

    @Test
    void getByTopicName_ThrowsWhenMissing() {
        when(topicRepository.findByTopicName("Unknown")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> topicService.getByTopicName("Unknown")
        );

        assertTrue(exception.getMessage().contains("Unknown"));
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

    @Test
    void updateTopic_ThrowsWhenRenamingToExistingName() {
        UUID topicId = UUID.randomUUID();
        Topic existing = Topic.builder()
                .topicId(topicId)
                .topicName("Old Name")
                .description("Old Description")
                .build();
        when(topicRepository.findById(topicId)).thenReturn(Optional.of(existing));
        when(topicRepository.existsByTopicName("Existing Name")).thenReturn(true);

        ResourceAlreadyExistsException exception = assertThrows(
                ResourceAlreadyExistsException.class,
                () -> topicService.updateTopic(topicId, "Existing Name", null)
        );

        assertTrue(exception.getMessage().contains("Existing Name"));
        verify(topicRepository, never()).save(any(Topic.class));
    }

    @Test
    void deleteTopic_DeletesWhenTopicExists() throws ResourceNotFoundException {
        UUID topicId = UUID.randomUUID();
        when(topicRepository.existsById(topicId)).thenReturn(true);

        topicService.deleteTopic(topicId);

        verify(topicRepository).deleteById(topicId);
    }

    @Test
    void deleteTopic_ThrowsWhenTopicMissing() {
        UUID topicId = UUID.randomUUID();
        when(topicRepository.existsById(topicId)).thenReturn(false);

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> topicService.deleteTopic(topicId)
        );

        assertTrue(exception.getMessage().contains(topicId.toString()));
    }

    @Test
    void deleteTopicByName_ResolvesTopicThenDeletes() throws ResourceNotFoundException {
        UUID topicId = UUID.randomUUID();
        Topic existing = Topic.builder()
                .topicId(topicId)
                .topicName("Algorithms")
                .description("Algorithms topic")
                .build();
        when(topicRepository.findByTopicName("Algorithms")).thenReturn(Optional.of(existing));

        topicService.deleteTopicByName("Algorithms");

        verify(topicRepository).deleteById(topicId);
    }
}
