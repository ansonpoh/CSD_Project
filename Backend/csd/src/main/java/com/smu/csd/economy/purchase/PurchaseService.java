package com.smu.csd.economy.purchase;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.smu.csd.economy.inventory.LearnerInventory;
import com.smu.csd.economy.inventory.LearnerInventoryRepository;
import com.smu.csd.economy.item.Item;
import com.smu.csd.economy.item.ItemRepository;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;

import jakarta.transaction.Transactional;

@Service
public class PurchaseService {
    private final PurchaseRepository repository;
    private final PurchaseLineRepository purchaseLineRepository;
    private final LearnerRepository learnerRepository;
    private final ItemRepository itemRepository;
    private final LearnerInventoryRepository learnerInventoryRepository;

    public PurchaseService(PurchaseRepository repository, PurchaseLineRepository purchaseLineRepository, LearnerRepository learnerRepository, ItemRepository itemRepository, LearnerInventoryRepository learnerInventoryRepository) {
        this.repository = repository;
        this.purchaseLineRepository = purchaseLineRepository;
        this.learnerRepository = learnerRepository;
        this.itemRepository = itemRepository;
        this.learnerInventoryRepository = learnerInventoryRepository;
    }

    @Transactional
    public Purchase createPurchase(UUID supabaseUserId, PurchaseRequest request) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if(learner == null) throw new RuntimeException("Learner not found.");

        Purchase purchase = Purchase.builder()
            .learner(learner)
            .purchased_at(LocalDateTime.now())
            .total_cost(0f)
            .build();
        purchase = repository.save(purchase);

        float totalCost = 0f;

        // For PurchaseLines
        for(PurchaseRequest.Line line : request.getLines()) {
            Item item = itemRepository.findById(line.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + line.getItemId()));
            
            int qty = Math.max(1, line.getQuantity());
            float unitPrice = item.getPrice() == null ? 0f : item.getPrice();
            totalCost += unitPrice * qty;

            PurchaseLine purchaseLine = PurchaseLine.builder()
                .purchase(purchase)
                .item(item)
                .quantity(qty)
                .unit_price(unitPrice)
                .build();
            purchaseLineRepository.save(purchaseLine);

            LearnerInventory inv = learnerInventoryRepository
                    .findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), item.getItemId())
                    .orElseGet(() -> LearnerInventory.builder()
                            .learner(learner)
                            .item(item)
                            .quantity(0)
                            .is_equipped(Boolean.FALSE)
                            .acquired_at(LocalDateTime.now())
                            .build());

            inv.setQuantity((inv.getQuantity() == null ? 0 : inv.getQuantity()) + qty);
            inv.setUpdated_at(LocalDateTime.now());
            learnerInventoryRepository.save(inv);
        }

        purchase.setTotal_cost(totalCost);
        return repository.save(purchase);

    }
    
}
