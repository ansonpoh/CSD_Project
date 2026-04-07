package com.smu.csd.monsters;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.monsters.monster_map.MonsterMap;
import com.smu.csd.monsters.monster_map.MonsterMapRepository;

import lombok.NonNull;

@Service
public class MonsterService {
    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 500;

    private final MonsterRepository repository;
    private final MonsterMapRepository monsterMapRepository;

    public MonsterService(MonsterRepository repository, MonsterMapRepository monsterMapRepository) {
        this.repository = repository;
        this.monsterMapRepository = monsterMapRepository;
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
