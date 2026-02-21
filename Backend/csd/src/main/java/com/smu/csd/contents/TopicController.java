package com.smu.csd.contents;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
