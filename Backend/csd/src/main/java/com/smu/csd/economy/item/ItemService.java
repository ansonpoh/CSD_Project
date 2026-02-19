package com.smu.csd.economy.item;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class ItemService {
    private final ItemRepository repository;

    public ItemService(ItemRepository repository) {
        this.repository = repository;
    }

    public List<Item> getAllItems() {
        return repository.findAll();
    }

    public Item getItemById(UUID item_id) {
        return repository.findById(item_id).orElseThrow(() -> new RuntimeException("Item not found."));
    }

    public Item saveItem(Item item) {
        return repository.save(item);
    }

    public Item updateItem(UUID item_id, Item item) {
        return repository.findById(item_id).map(current -> {
            current.setDescription(item.getDescription());
            current.setIs_active(item.getIs_active());
            current.setItem_type(item.getItem_type());
            current.setName(item.getName());
            current.setPrice(item.getPrice());
            return repository.save(current);
        }).orElseThrow(() -> new RuntimeException("Item not found."));
    }

    public void deleteItem(UUID item_id) {
        repository.deleteById(item_id);
    }
}
