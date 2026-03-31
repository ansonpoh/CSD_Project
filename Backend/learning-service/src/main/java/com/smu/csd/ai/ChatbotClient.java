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
import org.springframework.web.util.UriComponentsBuilder;

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

    /** POST /api/v1/query — params sent as URL query parameters */
    public QueryResponse query(String query, String conversationId, Integer maxChunks) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(chatbotUrl + "/api/v1/query")
                .queryParam("query", query);
        if (conversationId != null) builder.queryParam("conversation_id", conversationId);
        if (maxChunks != null) builder.queryParam("max_chunks", maxChunks);
        return restTemplate.postForObject(builder.toUriString(), null, QueryResponse.class);
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

    /** POST /api/v1/clear-history — conversation_id sent as URL query parameter */
    @SuppressWarnings("unchecked")
    public Map<String, Object> clearHistory(String conversationId) {
        String url = UriComponentsBuilder
                .fromUriString(chatbotUrl + "/api/v1/clear-history")
                .queryParam("conversation_id", conversationId)
                .toUriString();
        return restTemplate.postForObject(url, null, Map.class);
    }

    public record QueryResponse(String response, String conversation_id, Map<String, Object> additional_kwargs) {}
}
