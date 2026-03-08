package com.smu.csd.contents;

import java.util.List;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SemanticDuplicateService {

    private final EmbeddingModel embeddingModel;
    private final ObjectMapper objectMapper;

    public SemanticDuplicateService(EmbeddingModel embeddingModel, ObjectMapper objectMapper) {
        this.embeddingModel = embeddingModel;
        this.objectMapper = objectMapper;
    }

    public String buildText(String title, List<String> narrations) {
        String safeTitle = title == null ? "" : title;
        String safeNarrations = narrations == null ? "" : String.join(" ", narrations);
        return (safeTitle + "\n" + safeNarrations).trim();
    }

    public String createEmbeddingJson(String text) {
        try {
            float[] vector = embeddingModel.embed(text);
            return objectMapper.writeValueAsString(vector);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate embedding", e);
        }
    }

    public float[] readEmbeddingJson(String embeddingJson) {
        try {
            return objectMapper.readValue(embeddingJson, float[].class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse stored embedding", e);
        }
    }

    public double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length == 0 || b.length == 0 || a.length != b.length) {
            return 0.0;
        }

        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
