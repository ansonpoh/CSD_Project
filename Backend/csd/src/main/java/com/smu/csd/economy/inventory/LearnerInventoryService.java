package com.smu.csd.economy.inventory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.smu.csd.economy.Item;
import com.smu.csd.economy.ItemRepository;
import com.smu.csd.roles.learner.LearnerRepository;
import com.smu.csd.roles.learner.Learner;

@Service
public class LearnerInventoryService {
    private final LearnerInventoryRepository repository;
    private final LearnerRepository learnerRepository;
    private final ItemRepository itemRepository;

    public LearnerInventoryService (LearnerInventoryRepository repository, LearnerRepository learnerRepository, ItemRepository itemRepository) {
        this.repository = repository;
        this.learnerRepository = learnerRepository;
        this.itemRepository = itemRepository;
    }

    private InventoryItemResponse toResponse(LearnerInventory li) {
        Item item = li.getItem();
        return InventoryItemResponse.builder()
                .learner_inventory_id(li.getLearner_inventory_id())
                .itemId(item.getItemId())
                .name(item.getName())
                .description(item.getDescription())
                .item_type(item.getItem_type())
                .price(item.getPrice())
                .quantity(li.getQuantity())
                .is_equipped(li.getIs_equipped())
                .build();
    }

    public List<InventoryItemResponse> getMyInventory(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        return repository.findByLearnerLearnerId(learner.getLearnerId())
            .stream().map(this::toResponse).toList();
    }

    public List<InventoryItemResponse> addOrIncrement(UUID supabaseUserId, InventoryRequest request) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        Item item = itemRepository.findById(request.getItemId()).orElseThrow(() -> new RuntimeException("Item not found."));
        int qty = request.getQuantity() == null ? 1 : Math.max(1, request.getQuantity());

        LearnerInventory inventory = repository.findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), item.getItemId()).orElseGet(() -> LearnerInventory.builder()
            .learner(learner)
            .item(item)
            .quantity(0)
            .is_equipped(Boolean.FALSE)
            .acquired_at(LocalDateTime.now())
            .build());

        int currentQuantity = inventory.getQuantity() == null ? 0 : inventory.getQuantity();
        inventory.setQuantity(currentQuantity + qty);
        inventory.setUpdated_at(LocalDateTime.now());
        repository.save(inventory);
        return getMyInventory(supabaseUserId);
    }

    public List<InventoryItemResponse> removeOrDecrement(UUID supabaseUserId, UUID itemId, int quantity) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);

        LearnerInventory inventory = repository.findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), itemId).orElseThrow(() -> new RuntimeException("Item not found in learner inventory"));

        int qtyToRemove = Math.max(1, quantity);
        int currentQty = inventory.getQuantity() == null ? 0 : inventory.getQuantity();
        int remaining = currentQty - qtyToRemove;

        if (remaining <= 0) {
            repository.delete(inventory);
        } else {
            inventory.setQuantity(remaining);
            inventory.setUpdated_at(LocalDateTime.now());
            repository.save(inventory);
        }

        return getMyInventory(supabaseUserId);
    }

    
}
