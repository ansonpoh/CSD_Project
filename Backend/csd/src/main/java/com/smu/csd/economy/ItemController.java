package com.smu.csd.economy;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;



@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/economy")
public class ItemController {
    private final ItemService service;

    public ItemController(ItemService service) {
        this.service = service;
    }

    @GetMapping("/{item_id}")
    public Optional<Item> getItemById(@PathVariable UUID item_id) {
        return service.getItemById(item_id);
    }

    @GetMapping("/all")
    public List<Item> getAllItems() {
        return service.getAllItems();
    }

    @PostMapping("/add")
    public Item addItem(@Valid @RequestBody Item item) {
        return service.saveItem(item);
    }

    @PutMapping("/{item_id}")
    public Item updateItem(@PathVariable UUID item_id, @Valid @RequestBody Item item) {
        return service.updateItem(item_id, item);
    }

    @DeleteMapping("/{item_id}")
    public void deleteItem(@PathVariable UUID item_id) {
        service.deleteItem(item_id);
    }
    
}
