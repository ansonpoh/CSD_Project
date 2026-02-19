package com.smu.csd.monsters;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.smu.csd.monsters.monster_map.MonsterMap;
import com.smu.csd.monsters.monster_map.MonsterMapRepository;

@Service
public class MonsterService {
    private final MonsterRepository repository;
    private final MonsterMapRepository monsterMapRepository;

    public MonsterService(MonsterRepository repository, MonsterMapRepository monsterMapRepository) {
        this.repository = repository;
        this.monsterMapRepository = monsterMapRepository;
    }

    //Get Requests
    public List<Monster> getAllMonsters() {
        return repository.findAll();
    }

    public Monster getMonsterById(UUID monster_id) {
        return repository.findById(monster_id).orElseThrow(() -> new RuntimeException("Monster not found"));
    }

    public List<Monster> getMonstersByMapId(UUID map_id) {
        return monsterMapRepository.findAllByMapMapId(map_id).stream().map(MonsterMap::getMonster).collect(Collectors.toList());
    }

    //Post Requests
    public Monster saveMonster(Monster monster) {
        return repository.save(monster);
    }

    public Monster updateMonster(UUID monster_id, Monster monster) {
        return repository.findById(monster_id).map(current -> {
            current.setName(monster.getName());
            current.setDescription(monster.getDescription());
            current.setAsset(monster.getAsset());
            return repository.save(current);
        }).orElseThrow(() -> new RuntimeException("Monster not found"));
    }

    public void deleteMonster(UUID monster_id) {
        repository.deleteById(monster_id);
    }


}
