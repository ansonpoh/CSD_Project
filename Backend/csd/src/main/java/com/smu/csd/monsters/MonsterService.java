package com.smu.csd.monsters;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class MonsterService {
    private final MonsterRepository repository;

    public MonsterService(MonsterRepository repository) {
        this.repository = repository;
    }

    //Get Requests
    public List<Monster> getAllMonsters() {
        return repository.findAll();
    }

    public Optional<Monster> getMonsterById(UUID monster_id) {
        return repository.findById(monster_id);
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
