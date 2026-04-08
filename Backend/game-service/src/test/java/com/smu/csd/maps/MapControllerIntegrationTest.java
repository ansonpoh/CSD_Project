package com.smu.csd.maps;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.likes.MapLikeRequest;
import com.smu.csd.maps.ratings.MapRatingRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MapControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MapService mapService;

    @Test
    void getAllMaps_ExcludesUnpublishedForNonAdminUsers() throws Exception {
        UUID userId = UUID.randomUUID();
        MapCatalogResponse response = new MapCatalogResponse(
                UUID.randomUUID(),
                "Visible Map",
                "Description",
                "asset",
                null,
                "APPROVED",
                true,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0.0,
                0L,
                0L,
                null,
                false
        );
        when(mapService.getMapCatalog(eq(userId), eq(false))).thenReturn(List.of(response));

        mockMvc.perform(get("/api/maps/all")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_LEARNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Visible Map"));

        verify(mapService).getMapCatalog(userId, false);
    }

    @Test
    void getAllMaps_IncludesUnpublishedForAdminUsers() throws Exception {
        UUID userId = UUID.randomUUID();
        when(mapService.getMapCatalog(eq(userId), eq(true))).thenReturn(List.of());

        mockMvc.perform(get("/api/maps/all")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk());

        verify(mapService).getMapCatalog(userId, true);
    }

    @Test
    void updateLike_TreatsNullRequestBodyAsFalse() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        MapCatalogResponse response = new MapCatalogResponse(mapId, "Map", null, null, null, null, false, null, null, null, null, null, null, null, null, null, 0.0, 0L, 0L, null, false);
        when(mapService.updateMapLike(eq(mapId), eq(userId), eq(false))).thenReturn(response);

        mockMvc.perform(put("/api/maps/{mapId}/like", mapId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_LEARNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mapId").value(mapId.toString()));

        verify(mapService).updateMapLike(mapId, userId, false);
    }

    @Test
    void updateRating_TreatsNullRequestBodyAsZeroAndSurfacesValidationError() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        when(mapService.updateMapRating(eq(mapId), eq(userId), eq(0)))
                .thenThrow(new IllegalArgumentException("Rating must be between 1 and 5."));

        mockMvc.perform(put("/api/maps/{mapId}/rating", mapId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_LEARNER"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rating must be between 1 and 5."));

        verify(mapService).updateMapRating(mapId, userId, 0);
    }

    @Test
    void submitDraft_AcceptsNullRequestBodyAndDelegatesEmptyPublishRequest() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        Map map = Map.builder().mapId(UUID.randomUUID()).name("Submitted").build();
        when(mapService.submitDraft(eq(userId), eq(draftId), any(MapEditorDraftStore.PublishDraftRequest.class)))
                .thenReturn(map);

        mockMvc.perform(post("/api/maps/editor/drafts/{draftId}/submit", draftId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Submitted"));

        verify(mapService).submitDraft(eq(userId), eq(draftId), eq(new MapEditorDraftStore.PublishDraftRequest(null, null)));
    }

    @Test
    void publishDraft_AliasDelegatesToSubmitFlow() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        Map map = Map.builder().mapId(UUID.randomUUID()).name("Published").build();
        MapEditorDraftStore.PublishDraftRequest request = new MapEditorDraftStore.PublishDraftRequest("Name", "Description");
        when(mapService.submitDraft(eq(userId), eq(draftId), eq(request))).thenReturn(map);

        mockMvc.perform(post("/api/maps/editor/drafts/{draftId}/publish", draftId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Published"));

        verify(mapService).submitDraft(userId, draftId, request);
    }

    @Test
    void deleteDraft_DeletesContributorOwnedDraft() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();

        mockMvc.perform(delete("/api/maps/editor/drafts/{draftId}", draftId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isNoContent());

        verify(mapService).deleteDraft(userId, draftId);
    }

    @Test
    void getMapById_ReturnsTheOptionalMapPayloadFromTheService() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).name("Direct Map").build();
        when(mapService.getMapById(mapId)).thenReturn(Optional.of(map));

        mockMvc.perform(get("/api/maps/{mapId}", mapId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_LEARNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Direct Map"));
    }

    @Test
    void getMapsByWorldId_DelegatesWorldFilteringCorrectly() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID worldId = UUID.randomUUID();
        when(mapService.getMapsByWorldId(worldId)).thenReturn(List.of(
                Map.builder().mapId(UUID.randomUUID()).name("World Map").build()
        ));

        mockMvc.perform(get("/api/maps/world/{worldId}", worldId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_LEARNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("World Map"));

        verify(mapService).getMapsByWorldId(worldId);
    }

    @Test
    void getEditorRuntimeData_ReturnsTheEditorRuntimePayloadFromTheService() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        when(mapService.getEditorRuntimeData(mapId)).thenReturn(java.util.Map.of("previewUnavailable", false, "layers", List.of("ground")));

        mockMvc.perform(get("/api/maps/editor-data/{mapId}", mapId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_LEARNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previewUnavailable").value(false))
                .andExpect(jsonPath("$.layers[0]").value("ground"));

        verify(mapService).getEditorRuntimeData(mapId);
    }
}
