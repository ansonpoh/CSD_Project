package com.smu.csd.encounters;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/encounters")
public class EncounterController {
    private final EncounterService encounterService;

    public EncounterController(EncounterService encounterService) {
        this.encounterService = encounterService;
    }

    @GetMapping("/map/{mapId}/state")
    public EncounterStateResponse getEncounterState(@PathVariable UUID mapId, Authentication authentication) {
        return encounterService.getEncounterState(mapId, getSupabaseUserId(authentication));
    }

    @GetMapping("/map/{mapId}/pairs")
    public List<EncounterPairResponse> getPairs(@PathVariable UUID mapId) {
        return encounterService.getPairs(mapId);
    }

    @PutMapping("/map/{mapId}/pair")
    public EncounterPairResponse assignPair(@PathVariable UUID mapId, @RequestBody EncounterPairAssignRequest request) {
        return encounterService.assignPair(mapId, request.npcId(), request.monsterId());
    }

    @PutMapping("/map/{mapId}/npc/{npcId}/interact")
    public EncounterProgressResponse markNpcInteracted(
        @PathVariable UUID mapId,
        @PathVariable UUID npcId,
        Authentication authentication
    ) {
        return encounterService.markNpcInteracted(mapId, npcId, getSupabaseUserId(authentication));
    }

    @PostMapping("/combat/result")
    public EncounterProgressResponse recordCombatResult(
        @RequestBody EncounterCombatResultRequest request,
        Authentication authentication
    ) {
        return encounterService.recordCombatResult(request, getSupabaseUserId(authentication));
    }

    @PostMapping("/map/{mapId}/monster/{monsterId}/claim")
    public EncounterRewardClaimResponse claimReward(
        @PathVariable UUID mapId,
        @PathVariable UUID monsterId,
        Authentication authentication
    ) {
        return encounterService.claimReward(mapId, monsterId, getSupabaseUserId(authentication));
    }

    @GetMapping("/telemetry/dashboard")
    public EncounterTelemetryDashboardResponse getTelemetryDashboard(
        @RequestParam(required = false) UUID mapId
    ) {
        return encounterService.getTelemetryDashboard(mapId);
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
