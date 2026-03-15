package com.smu.csd;

import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.contents.ContentRepository;

import lombok.RequiredArgsConstructor;

/**
 * Controller for internal inter-service communication (e.g., game-service calling for Content).
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalLearningController {

    private final ContentRepository contentRepository;

    @GetMapping("/contents/{id}")
    public ResponseEntity<Map<String, Object>> getContent(@PathVariable UUID id) {
        return contentRepository.findById(id).map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("contentId", c.getContentId());
            map.put("title", c.getTitle());
            map.put("body", c.getBody());
            map.put("topicId", c.getTopic() != null ? c.getTopic().getTopicId() : null);
            map.put("topicName", c.getTopic() != null ? c.getTopic().getTopicName() : null);
            map.put("videoUrl", c.getVideoUrl());
            map.put("status", c.getStatus() != null ? c.getStatus().name() : "DRAFT");
            return ResponseEntity.ok(map);
        }).orElse(ResponseEntity.notFound().build());
    }
}
