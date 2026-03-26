package com.smu.csd.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class ChatbotClient {

    private final RestTemplate restTemplate;

    @Value("${chatbot.url:http://chatbot:8080}")
    private String chatbotUrl;

    public ChatbotClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** POST /api/v1/query */
    public QueryResponse query(String query, String conversationId, Integer maxChunks) {
        String url = chatbotUrl + "/api/v1/query";
        return restTemplate.postForObject(url, new QueryRequest(query, conversationId, maxChunks), QueryResponse.class);
    }

    /** POST /api/v1/process-document — multipart file upload (pdf, json, csv) */
    @SuppressWarnings("unchecked")
    public Map<String, Object> processDocument(MultipartFile file) throws IOException {
        String url = chatbotUrl + "/api/v1/process-document";

        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() { return file.getOriginalFilename(); }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return restTemplate.postForObject(url, new HttpEntity<>(body, headers), Map.class);
    }

    /** POST /api/v1/clear-history */
    @SuppressWarnings("unchecked")
    public Map<String, Object> clearHistory(String conversationId) {
        String url = chatbotUrl + "/api/v1/clear-history";
        return restTemplate.postForObject(url, new ClearHistoryRequest(conversationId), Map.class);
    }

    public record QueryRequest(String query, String conversation_id, Integer max_chunks) {}
    public record QueryResponse(String response, String conversation_id, Map<String, Object> additional_kwargs) {}

    public record ClearHistoryRequest(String conversation_id) {}
}
