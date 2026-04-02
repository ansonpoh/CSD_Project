package com.smu.csd.encounters;

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

import com.smu.csd.encounters.dtos.EncounterClaimRewardResponseDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultRequestDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultResponseDto;
import com.smu.csd.encounters.dtos.EncounterNpcInteractResponseDto;
import com.smu.csd.encounters.dtos.EncounterRuntimeDto;
import com.smu.csd.encounters.dtos.EncounterStateDto;
import com.smu.csd.encounters.dtos.EncounterTelemetryDashboardDto;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/encounters")
public class EncounterController {
    private final EncounterService encounterService;

    public EncounterController(EncounterService encounterService) {
        this.encounterService = encounterService;
    }

    @GetMapping("/map/{mapId}/state")
    public EncounterStateDto getEncounterState(@PathVariable UUID mapId, Authentication authentication) {
        return encounterService.getEncounterState(mapId, getSupabaseUserId(authentication));
    }

    @GetMapping("/map/{mapId}/runtime")
    public EncounterRuntimeDto getEncounterRuntime(@PathVariable UUID mapId, Authentication authentication) {
        return encounterService.getEncounterRuntime(mapId, getSupabaseUserId(authentication));
    }

    @PutMapping("/map/{mapId}/npc/{npcId}/interact")
    public EncounterNpcInteractResponseDto markNpcInteracted(
        @PathVariable UUID mapId,
        @PathVariable UUID npcId,
        Authentication authentication
    ) {
        return encounterService.markNpcInteracted(mapId, npcId, getSupabaseUserId(authentication));
    }

    @PostMapping("/combat/result")
    public EncounterCombatResultResponseDto recordCombatResult(
        @RequestBody EncounterCombatResultRequestDto request,
        Authentication authentication
    ) {
        return encounterService.recordCombatResult(request, getSupabaseUserId(authentication));
    }

    @PostMapping("/map/{mapId}/monster/{monsterId}/claim")
    public EncounterClaimRewardResponseDto claimReward(
        @PathVariable UUID mapId,
        @PathVariable UUID monsterId,
        Authentication authentication
    ) {
        return encounterService.claimReward(mapId, monsterId, getSupabaseUserId(authentication));
    }

    @GetMapping("/telemetry/dashboard")
    public EncounterTelemetryDashboardDto getTelemetryDashboard(@RequestParam(required = false) UUID mapId) {
        return encounterService.getTelemetryDashboard(mapId);
    }

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
