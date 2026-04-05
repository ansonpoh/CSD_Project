package com.smu.csd.economy.purchase;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.smu.csd.economy.inventory.LearnerInventory;
import com.smu.csd.economy.inventory.LearnerInventoryRepository;
import com.smu.csd.economy.item.Item;
import com.smu.csd.economy.item.ItemRepository;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

import jakarta.transaction.Transactional;

@Service
public class PurchaseService {
    private final PurchaseRepository repository;
    private final PurchaseLineRepository purchaseLineRepository;
    private final LearnerRepository learnerRepository;
    private final ItemRepository itemRepository;
    private final LearnerInventoryRepository learnerInventoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PurchaseService(
        PurchaseRepository repository,
        PurchaseLineRepository purchaseLineRepository,
        LearnerRepository learnerRepository,
        ItemRepository itemRepository,
        LearnerInventoryRepository learnerInventoryRepository,
        ApplicationEventPublisher eventPublisher
    ) {
        this.repository = repository;
        this.purchaseLineRepository = purchaseLineRepository;
        this.learnerRepository = learnerRepository;
        this.itemRepository = itemRepository;
        this.learnerInventoryRepository = learnerInventoryRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Purchase createPurchase(UUID supabaseUserId, PurchaseRequest request) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if(learner == null) throw new RuntimeException("Learner not found.");

        LocalDateTime now = LocalDateTime.now();
        float totalCost = 0f;
        List<ResolvedLine> resolvedLines = new ArrayList<>();

        for(PurchaseRequest.Line line : request.getLines()) {
            Item item = itemRepository.findById(line.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + line.getItemId()));
            
            int qty = Math.max(1, line.getQuantity());
            float unitPrice = item.getPrice() == null ? 0f : item.getPrice();
            float lineCost = unitPrice * qty;
            totalCost += lineCost;
            resolvedLines.add(new ResolvedLine(item, qty, unitPrice));
        }

        int goldCost = Math.round(totalCost);
        int currentGold = learner.getGold() == null ? 0 : learner.getGold();
        if (currentGold < goldCost) {
            throw new RuntimeException("Insufficient gold.");
        }

        learner.setGold(currentGold - goldCost);
        learner.setUpdated_at(now);
        learnerRepository.save(learner);

        Purchase purchase = Purchase.builder()
            .learner(learner)
            .purchased_at(now)
            .total_cost(totalCost)
            .build();
        purchase = repository.save(purchase);

        // For PurchaseLines and inventory updates
        for (ResolvedLine line : resolvedLines) {
            PurchaseLine purchaseLine = PurchaseLine.builder()
                .purchase(purchase)
                .item(line.item())
                .quantity(line.quantity())
                .unit_price(line.unitPrice())
                .build();
            purchaseLineRepository.save(purchaseLine);

            LearnerInventory inv = learnerInventoryRepository
                    .findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), line.item().getItemId())
                    .orElseGet(() -> LearnerInventory.builder()
                            .learner(learner)
                            .item(line.item())
                            .quantity(0)
                            .is_equipped(Boolean.FALSE)
                            .acquired_at(now)
                            .build());

            inv.setQuantity((inv.getQuantity() == null ? 0 : inv.getQuantity()) + line.quantity());
            inv.setUpdated_at(now);
            learnerInventoryRepository.save(inv);
        }

        eventPublisher.publishEvent(new PurchaseCompletedEvent(
            learner.getLearnerId(),
            purchase.getPurchase_id(),
            purchase.getTotal_cost()
        ));

        return purchase;

    }

    private record ResolvedLine(Item item, int quantity, float unitPrice) {}
    
}
