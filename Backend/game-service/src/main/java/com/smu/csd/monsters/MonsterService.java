package com.smu.csd.monsters;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.monsters.monster_map.MonsterMap;
import com.smu.csd.monsters.monster_map.MonsterMapAssignRequest;
import com.smu.csd.monsters.monster_map.MonsterMapRepository;

import lombok.NonNull;

@Service
public class MonsterService {
    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 500;

    private final MonsterRepository repository;
    private final MonsterMapRepository monsterMapRepository;
    private final MapRepository mapRepository;

    @Value("${game.limits.min-monsters-per-map:1}")
    private int minMonstersPerMap;

    @Value("${game.limits.max-monsters-per-map:2}")
    private int maxMonstersPerMap;

    public MonsterService(
            MonsterRepository repository,
            MonsterMapRepository monsterMapRepository,
            MapRepository mapRepository
    ) {
        this.repository = repository;
        this.monsterMapRepository = monsterMapRepository;
        this.mapRepository = mapRepository;
    }

    //Get Requests
    public List<Monster> getAllMonsters() {
        return getAllMonsters(0, DEFAULT_PAGE_SIZE);
    }

    public List<Monster> getAllMonsters(int page, int size) {
        return repository.findAll(
                PageRequest.of(
                        normalizePage(page),
                        normalizeSize(size),
                        Sort.by(Sort.Direction.ASC, "monsterId")
                )
        ).getContent();
    }

    public @NonNull Monster getMonsterById(@NonNull UUID monsterId) {
        return repository.findById(monsterId)
            .orElseThrow(() -> new ResourceNotFoundException("Monster", "id", monsterId));
    }

    public List<Monster> getMonstersByMapId(@NonNull UUID map_id) {
        return monsterMapRepository.findAllByMapMapId(map_id)
            .stream()
            .map(MonsterMap::getMonster)
            .collect(Collectors.toList());
    }

    public List<Monster> assignMonstersToMap(@NonNull MonsterMapAssignRequest request) {
        UUID mapId = request.mapId();
        if (mapId == null) {
            throw new IllegalArgumentException("mapId is required.");
        }

        List<UUID> incomingMonsterIds = request.monsterIds() == null ? List.of() : request.monsterIds();
        List<UUID> uniqueMonsterIds = incomingMonsterIds.stream()
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        if (uniqueMonsterIds.size() < minMonstersPerMap || uniqueMonsterIds.size() > maxMonstersPerMap) {
            throw new IllegalArgumentException(
                "Each map must have between " + minMonstersPerMap + " and " + maxMonstersPerMap + " monsters."
            );
        }

        com.smu.csd.maps.Map map = mapRepository.findById(mapId)
            .orElseThrow(() -> new ResourceNotFoundException("Map", "id", mapId));

        if (!Boolean.TRUE.equals(map.getPublished()) || map.getStatus() != com.smu.csd.maps.Map.Status.APPROVED) {
            throw new IllegalStateException("Only approved and published maps can receive monster assignments.");
        }

        List<Monster> monsters = uniqueMonsterIds.stream()
            .map(this::getMonsterById)
            .toList();

        monsterMapRepository.deleteAllByMapMapId(mapId);

        monsters.forEach(monster -> monsterMapRepository.save(
            MonsterMap.builder()
                .map(map)
                .monster(monster)
                .build()
        ));

        return getMonstersByMapId(mapId);
    }

    //Post Requests
    public Monster saveMonster(@NonNull Monster monster) {
        return repository.save(monster);
    }

    public Monster updateMonster(@NonNull UUID monsterId, @NonNull Monster monster) {
        return repository.findById(monsterId).map(current -> {
            current.setName(monster.getName());
            current.setDescription(monster.getDescription());
            current.setAsset(monster.getAsset());
            return repository.save(current);
        }).orElseThrow(() -> new ResourceNotFoundException("Monster", "id", monsterId));
    }

    public void deleteMonster(@NonNull UUID monsterId) {
        if (!repository.existsById(monsterId)) {
            throw new ResourceNotFoundException("Monster", "id", monsterId);
        }
        repository.deleteById(monsterId);
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
