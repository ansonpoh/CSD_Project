package com.smu.csd.maps;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.smu.csd.exception.ResourceNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

class MapEditorDraftStoreUnitTest {

    @TempDir
    Path tempDir;

    private ObjectMapper objectMapper;
    private MapEditorDraftStore store;

    @BeforeEach
    void setUp() {
        objectMapper = JsonMapper.builder().findAndAddModules().build();
        store = new MapEditorDraftStore(objectMapper);
        ReflectionTestUtils.setField(store, "rootDir", tempDir);
    }

    @Test
    void save_TrimsTextFieldsAndPreservesPublishMetadataOnUpdate() {
        UUID ownerId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        UUID publishedMapId = UUID.randomUUID();

        MapEditorDraftStore.DraftRecord created = store.save(ownerId, new MapEditorDraftStore.SaveDraftRequest(
                draftId,
                "  Draft Name  ",
                "  Draft Description  ",
                "  Forest  ",
                "  Hard  ",
                objectMapper.createObjectNode().put("stage", 1)
        ));

        assertEquals("Draft Name", created.name());
        assertEquals("Draft Description", created.description());
        assertEquals("Forest", created.biome());
        assertEquals("Hard", created.difficulty());
        assertFalse(created.published());

        store.markPublished(draftId, publishedMapId);

        MapEditorDraftStore.DraftRecord updated = store.save(ownerId, new MapEditorDraftStore.SaveDraftRequest(
                draftId,
                "  Updated Name  ",
                "  Updated Description  ",
                "  Desert  ",
                "  Extreme  ",
                objectMapper.createObjectNode().put("stage", 2)
        ));

        assertEquals(created.createdAt(), updated.createdAt());
        assertEquals("Updated Name", updated.name());
        assertEquals("Updated Description", updated.description());
        assertEquals("Desert", updated.biome());
        assertEquals("Extreme", updated.difficulty());
        assertTrue(updated.published());
        assertEquals(publishedMapId, updated.publishedMapId());
    }

    @Test
    void getMine_RejectsDifferentOwnerAndGetAnyThrowsWhenMissing() {
        UUID ownerId = UUID.randomUUID();
        UUID otherOwnerId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();

        store.save(ownerId, new MapEditorDraftStore.SaveDraftRequest(
                draftId,
                "Draft",
                "Description",
                "Biome",
                "Difficulty",
                objectMapper.createObjectNode()
        ));

        assertThrows(ResourceNotFoundException.class, () -> store.getMine(otherOwnerId, draftId));
        assertThrows(ResourceNotFoundException.class, () -> store.getAny(UUID.randomUUID()));
    }

    @Test
    void markPublished_UpdatesStoredDraftMetadata() {
        UUID ownerId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();

        store.save(ownerId, new MapEditorDraftStore.SaveDraftRequest(
                draftId,
                "Draft",
                "Description",
                "Biome",
                "Difficulty",
                objectMapper.createObjectNode()
        ));

        store.markPublished(draftId, mapId);

        MapEditorDraftStore.DraftRecord published = store.getAny(draftId);
        assertTrue(published.published());
        assertEquals(mapId, published.publishedMapId());
    }

    @Test
    void listMine_IgnoresMalformedDraftFilesAndSortsByUpdatedAtDescending() throws IOException {
        UUID ownerId = UUID.randomUUID();
        UUID otherOwnerId = UUID.randomUUID();
        MapEditorDraftStore.DraftRecord older = new MapEditorDraftStore.DraftRecord(
                UUID.randomUUID(),
                ownerId,
                "Older",
                "Old desc",
                "Forest",
                "Easy",
                objectMapper.createObjectNode(),
                Instant.parse("2026-04-01T00:00:00Z"),
                Instant.parse("2026-04-01T00:00:00Z"),
                false,
                null
        );
        MapEditorDraftStore.DraftRecord newer = new MapEditorDraftStore.DraftRecord(
                UUID.randomUUID(),
                ownerId,
                "Newer",
                "New desc",
                "Desert",
                "Hard",
                objectMapper.createObjectNode(),
                Instant.parse("2026-04-02T00:00:00Z"),
                Instant.parse("2026-04-02T00:00:00Z"),
                true,
                UUID.randomUUID()
        );
        MapEditorDraftStore.DraftRecord otherOwner = new MapEditorDraftStore.DraftRecord(
                UUID.randomUUID(),
                otherOwnerId,
                "Other",
                "Other desc",
                "Ice",
                "Medium",
                objectMapper.createObjectNode(),
                Instant.parse("2026-04-03T00:00:00Z"),
                Instant.parse("2026-04-03T00:00:00Z"),
                false,
                null
        );

        objectMapper.writeValue(tempDir.resolve(older.draftId() + ".json").toFile(), older);
        objectMapper.writeValue(tempDir.resolve(newer.draftId() + ".json").toFile(), newer);
        objectMapper.writeValue(tempDir.resolve(otherOwner.draftId() + ".json").toFile(), otherOwner);
        Files.writeString(tempDir.resolve("broken.json"), "{not-json");

        List<MapEditorDraftStore.DraftSummary> summaries = store.listMine(ownerId);

        assertEquals(2, summaries.size());
        assertEquals(newer.draftId(), summaries.get(0).draftId());
        assertEquals(older.draftId(), summaries.get(1).draftId());
    }
}
