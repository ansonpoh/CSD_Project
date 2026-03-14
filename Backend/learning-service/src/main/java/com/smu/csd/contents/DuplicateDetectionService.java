package com.smu.csd.contents;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class DuplicateDetectionService {

    public String normalize(String title, List<String> narrations) {
        String safeTitle = title == null ? "" : title;
        String safeNarrations = narrations == null ? "" : String.join(" ", narrations);

        String joined = safeTitle + " " + safeNarrations;
        return joined.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public String fingerprint(String normalized) {
        String safeNormalized = normalized == null ? "" : normalized;

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(safeNormalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
