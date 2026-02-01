package com.smu.csd.maps;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class MapService {
    private final MapRepository repository;

    public MapService(MapRepository repository) {
        this.repository = repository;
    }

    //Get requests
    public List<Map> getAllMaps() {
        return repository.findAll();
    }

    public Optional<Map> getMapById(UUID map_id) {
        return repository.findById(map_id);
    }

    public List<Map> getMapsByWorldId(UUID world_id) {
        return repository.findByWorld_world_id(world_id);
    }

    //Post requests
    public Map saveMap(Map map) {
        return repository.save(map);
    }
}
