package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.smu.csd.exception.ResourceAlreadyExistsException;
import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("api/topic")
public class TopicController {
    private final TopicService service;

    public TopicController(TopicService service) {
        this.service = service;
    }

    // for frontend to show topic dropdown
    @GetMapping("/all")
    public ResponseEntity<List<Topic>> getAllTopics(){
        return ResponseEntity.ok(service.getAllTopics());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Topic> getById(@PathVariable UUID id) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Topic> createTopic(@RequestBody TopicRequest request)
            throws ResourceAlreadyExistsException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createTopic(request.topicName(), request.description()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Topic> updateTopic(@PathVariable UUID id, @RequestBody TopicRequest request)
            throws ResourceNotFoundException, ResourceAlreadyExistsException {
        return ResponseEntity.ok(service.updateTopic(id, request.topicName(), request.description()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTopic(@PathVariable UUID id) throws ResourceNotFoundException {
        service.deleteTopic(id);
        return ResponseEntity.noContent().build();
    }

    public record TopicRequest(String topicName, String description) {}
}
