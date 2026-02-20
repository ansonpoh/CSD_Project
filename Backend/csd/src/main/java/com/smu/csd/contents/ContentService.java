package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.contributor.ContributorService;

@Service
public class ContentService {
    private final ContentRepository contentRepository;
    private final TopicService topicService;
    private final ContributorService contributorService;

    public ContentService(ContentRepository contentRepository, TopicService topicService,
            ContributorService contributorService) {
        this.contentRepository = contentRepository;
        this.topicService = topicService;
        this.contributorService = contributorService;
    }

    @Transactional
    public Content createContent(UUID contributorId, UUID topicId, String title, String body)
            throws ResourceNotFoundException {
        contributorService.getById(contributorId); // validates contributor exists
        Topic topic = topicService.getById(topicId);

        Content content = Content.builder()
                .contributorId(contributorId)
                .topic(topic)
                .title(title)
                .body(body)
                .build();

        return contentRepository.save(content);
    }

    public List<Content> getAllContents() {
        return contentRepository.findAll();
    }

    public Content getById(UUID contentId) throws ResourceNotFoundException {
        return contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "contentId", contentId));
    }

    public List<Content> getByTopic(UUID topicId) throws ResourceNotFoundException {
        Topic topic = topicService.getById(topicId);
        return contentRepository.findByTopic(topic);
    }

    public List<Content> getByStatus(Content.Status status) {
        return contentRepository.findByStatus(status);
    }

    public List<Content> getByContributorId(UUID contributorId) {
        return contentRepository.findByContributorId(contributorId);
    }

    public List<Content> searchByTitle(String keyword) {
        return contentRepository.findByTitleContainingIgnoreCase(keyword);
    }

    @Transactional
    public Content updateContent(UUID contentId, UUID topicId, String title, String body)
            throws ResourceNotFoundException {
        Content content = getById(contentId);

        if (topicId != null) {
            Topic topic = topicService.getById(topicId);
            content.setTopic(topic);
        }
        if (title != null) {
            content.setTitle(title);
        }
        if (body != null) {
            content.setBody(body);
        }

        return contentRepository.save(content);
    }

    @Transactional
    public Content updateStatus(UUID contentId, Content.Status status)
            throws ResourceNotFoundException {
        Content content = getById(contentId);
        content.setStatus(status);
        return contentRepository.save(content);
    }

    @Transactional
    public void deleteContent(UUID contentId) throws ResourceNotFoundException {
        if (!contentRepository.existsById(contentId)) {
            throw new ResourceNotFoundException("Content", "contentId", contentId);
        }
        contentRepository.deleteById(contentId);
    }
}