package com.smu.csd.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotClient chatbotClient;

    /** POST /api/chatbot/query */
    @PostMapping("/query")
    public ResponseEntity<ChatbotClient.QueryResponse> query(@RequestBody QueryRequest request) {
        return ResponseEntity.ok(
            chatbotClient.query(request.query(), request.conversation_id(), request.max_chunks())
        );
    }

    /** POST /api/chatbot/process-document — admin only, multipart (pdf/json/csv) */
    @PostMapping(value = "/process-document", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> processDocument(
            @RequestParam MultipartFile file) throws IOException {
        return ResponseEntity.ok(chatbotClient.processDocument(file));
    }

    /** POST /api/chatbot/clear-history */
    @PostMapping("/clear-history")
    public ResponseEntity<Map<String, Object>> clearHistory(@RequestBody ClearHistoryRequest request) {
        return ResponseEntity.ok(chatbotClient.clearHistory(request.conversation_id()));
    }

    public record QueryRequest(String query, String conversation_id, Integer max_chunks) {}
    public record ClearHistoryRequest(String conversation_id) {}
}
