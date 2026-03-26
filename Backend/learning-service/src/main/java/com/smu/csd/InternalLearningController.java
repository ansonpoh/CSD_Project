package com.smu.csd;

import java.util.Map;
import java.util.UUID;
import java.util.HashMap;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.contents.ratings.ContentRatingResponse;
import com.smu.csd.contents.ratings.ContentRatingService;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * Controller for internal inter-service communication (e.g., game-service calling for Content).
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalLearningController {

    private final ContentRepository contentRepository;
    private final ContentRatingService contentRatingService;
    private final TopicService topicService;

    @GetMapping("/contents/{id}")
    public ResponseEntity<Map<String, Object>> getContent(@PathVariable UUID id) {
        return contentRepository.findById(id).map(c -> {
            return ResponseEntity.ok(buildContentPayload(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/contents/batch")
    public ResponseEntity<List<Map<String, Object>>> getContentsBatch(@RequestBody List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Map<String, Object>> payload = contentRepository.findAllById(ids).stream()
            .map(this::buildContentPayload)
            .toList();
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/topics/{id}")
    public ResponseEntity<Map<String, Object>> getTopic(@PathVariable UUID id) {
        try {
            Topic topic = topicService.getById(id);
            Map<String, Object> payload = new HashMap<>();
            payload.put("topicId", topic.getTopicId());
            payload.put("topicName", topic.getTopicName());
            payload.put("description", topic.getDescription());
            return ResponseEntity.ok(payload);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private Map<String, Object> buildContentPayload(Content c) {
        ContentRatingResponse rating = null;
        try {
            rating = contentRatingService.getRatingSummaryForLearner(c.getContentId(), null);
        } catch (Exception ignored) {
            rating = null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("contentId", c.getContentId());
        map.put("title", c.getTitle());
        map.put("body", c.getBody());
        map.put("topicId", c.getTopic() != null ? c.getTopic().getTopicId() : null);
        map.put("topicName", c.getTopic() != null ? c.getTopic().getTopicName() : null);
        map.put("videoUrl", c.getVideoUrl());
        map.put("status", c.getStatus() != null ? c.getStatus().name() : "DRAFT");
        map.put("averageRating", rating == null ? 0.0 : rating.averageRating());
        map.put("ratingCount", rating == null ? 0L : rating.ratingCount());
        return map;
    }
}
