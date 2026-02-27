package com.smu.csd.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class MapEditorDraftStore {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path rootDir;

    public MapEditorDraftStore() {
        String base = System.getenv().getOrDefault("MAP_EDITOR_STORAGE_DIR", "");
        this.rootDir = base.isBlank()
                ? Paths.get(System.getProperty("java.io.tmpdir"), "csd-map-editor-drafts")
                : Paths.get(base);
    }

    public DraftRecord save(UUID ownerSupabaseUserId, SaveDraftRequest request) {
        UUID draftId = request.draftId() == null ? UUID.randomUUID() : request.draftId();
        DraftRecord current = readIfExists(draftId);
        if (current != null && !ownerSupabaseUserId.equals(current.ownerSupabaseUserId())) {
            throw new IllegalArgumentException("You do not own this draft");
        }

        Instant now = Instant.now();
        DraftRecord toSave = new DraftRecord(
                draftId,
                ownerSupabaseUserId,
                safe(request.name()),
                safe(request.description()),
                safe(request.biome()),
                safe(request.difficulty()),
                request.mapData(),
                current == null ? now : current.createdAt(),
                now,
                current != null && current.published(),
                current == null ? null : current.publishedMapId()
        );
        write(toSave);
        return toSave;
    }

    public DraftRecord getMine(UUID ownerSupabaseUserId, UUID draftId) throws ResourceNotFoundException {
        DraftRecord record = readIfExists(draftId);
        if (record == null || !ownerSupabaseUserId.equals(record.ownerSupabaseUserId())) {
            throw new ResourceNotFoundException("MapDraft", "draftId", draftId);
        }
        return record;
    }

    public List<DraftSummary> listMine(UUID ownerSupabaseUserId) {
        ensureDir();
        List<DraftSummary> out = new ArrayList<>();
        try (Stream<Path> paths = Files.list(rootDir)) {
            paths.filter(p -> p.getFileName().toString().endsWith(".json"))
                    .forEach(p -> {
                        try {
                            DraftRecord r = objectMapper.readValue(p.toFile(), DraftRecord.class);
                            if (ownerSupabaseUserId.equals(r.ownerSupabaseUserId())) {
                                out.add(new DraftSummary(
                                        r.draftId(),
                                        r.name(),
                                        r.description(),
                                        r.updatedAt(),
                                        r.published(),
                                        r.publishedMapId()
                                ));
                            }
                        } catch (Exception ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
        out.sort(Comparator.comparing(DraftSummary::updatedAt).reversed());
        return out;
    }

    public void markPublished(UUID draftId, UUID mapId) {
        DraftRecord current = readIfExists(draftId);
        if (current == null) return;
        DraftRecord updated = new DraftRecord(
                current.draftId(),
                current.ownerSupabaseUserId(),
                current.name(),
                current.description(),
                current.biome(),
                current.difficulty(),
                current.mapData(),
                current.createdAt(),
                Instant.now(),
                true,
                mapId
        );
        write(updated);
    }

    public DraftRecord getAny(UUID draftId) throws ResourceNotFoundException {
        DraftRecord record = readIfExists(draftId);
        if (record == null) {
            throw new ResourceNotFoundException("MapDraft", "draftId", draftId);
        }
        return record;
    }

    private DraftRecord readIfExists(UUID draftId) {
        ensureDir();
        Path file = rootDir.resolve(draftId.toString() + ".json");
        if (!Files.exists(file)) return null;
        try {
            return objectMapper.readValue(file.toFile(), DraftRecord.class);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read map draft: " + draftId, e);
        }
    }

    private void write(DraftRecord record) {
        ensureDir();
        Path file = rootDir.resolve(record.draftId().toString() + ".json");
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), record);
        } catch (IOException e) {
            throw new RuntimeException("Failed to save map draft: " + record.draftId(), e);
        }
    }

    private void ensureDir() {
        try {
            Files.createDirectories(rootDir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create map editor storage directory", e);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    public record SaveDraftRequest(
            UUID draftId,
            String name,
            String description,
            String biome,
            String difficulty,
            JsonNode mapData
    ) {}

    public record PublishDraftRequest(
            String name,
            String description
    ) {}

    public record DraftSummary(
            UUID draftId,
            String name,
            String description,
            Instant updatedAt,
            boolean published,
            UUID publishedMapId
    ) {}

    public record DraftRecord(
            UUID draftId,
            UUID ownerSupabaseUserId,
            String name,
            String description,
            String biome,
            String difficulty,
            JsonNode mapData,
            Instant createdAt,
            Instant updatedAt,
            boolean published,
            UUID publishedMapId
    ) {}
}
