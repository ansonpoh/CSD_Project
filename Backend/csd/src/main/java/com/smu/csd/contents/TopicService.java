package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

@Service
public class TopicService {
    private final TopicRepository repository;

    public TopicService(TopicRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Topic createTopic(String topicName, String description)
            throws ResourceAlreadyExistsException {
        if (repository.existsByTopicName(topicName)) {
            throw new ResourceAlreadyExistsException("Topic", "topicName", topicName);
        }

        Topic topic = Topic.builder()
                .topicName(topicName)
                .description(description)
                .build();

        return repository.save(topic);
    }

    public List<Topic> getAllTopics() {
        return repository.findAll();
    }

    public Topic getById(UUID topicId) throws ResourceNotFoundException {
        return repository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", "topicId", topicId));
    }

    public Topic getByTopicName(String topicName) throws ResourceNotFoundException {
        return repository.findByTopicName(topicName)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", "topicName", topicName));
    }

    @Transactional
    public Topic updateTopic(UUID topicId, String topicName, String description)
            throws ResourceNotFoundException, ResourceAlreadyExistsException {
        Topic topic = getById(topicId);

        if (topicName != null) {
            if (!topicName.equals(topic.getTopicName()) && repository.existsByTopicName(topicName)) {
                throw new ResourceAlreadyExistsException("Topic", "topicName", topicName);
            }
            topic.setTopicName(topicName);
        }
        if (description != null) {
            topic.setDescription(description);
        }

        return repository.save(topic);
    }

    @Transactional
    public void deleteTopic(UUID topicId) throws ResourceNotFoundException {
        if (!repository.existsById(topicId)) {
            throw new ResourceNotFoundException("Topic", "topicId", topicId);
        }
        repository.deleteById(topicId);
    }

    @Transactional
    public void deleteTopicByName(String topicName) throws ResourceNotFoundException {
        Topic topic = getByTopicName(topicName);
        repository.deleteById(topic.getTopicId());
    }
}