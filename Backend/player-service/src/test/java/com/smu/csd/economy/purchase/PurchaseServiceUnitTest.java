package com.smu.csd.economy.purchase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyFloat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.smu.csd.economy.inventory.LearnerInventory;
import com.smu.csd.economy.inventory.LearnerInventoryRepository;
import com.smu.csd.economy.item.Item;
import com.smu.csd.economy.item.ItemRepository;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

public class PurchaseServiceUnitTest {

    private PurchaseRepository repository;
    private PurchaseLineRepository purchaseLineRepository;
    private LearnerRepository learnerRepository;
    private ItemRepository itemRepository;
    private LearnerInventoryRepository learnerInventoryRepository;
    private ApplicationEventPublisher eventPublisher;
    private PurchaseService service;

    @BeforeEach
    void setUp() {
        repository = mock(PurchaseRepository.class);
        purchaseLineRepository = mock(PurchaseLineRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        itemRepository = mock(ItemRepository.class);
        learnerInventoryRepository = mock(LearnerInventoryRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new PurchaseService(
                repository,
                purchaseLineRepository,
                learnerRepository,
                itemRepository,
                learnerInventoryRepository,
                eventPublisher
        );
    }

    @Test
    void createPurchase_RejectsUnknownLearner() {
        UUID supabaseUserId = UUID.randomUUID();
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> service.createPurchase(supabaseUserId, request(line(UUID.randomUUID(), 1)))
        );

        assertEquals("Learner not found.", exception.getMessage());
    }

    @Test
    void createPurchase_RejectsInsufficientGold() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), 10);
        Item item = item(UUID.randomUUID(), 25f);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(item.getItemId())).thenReturn(Optional.of(item));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> service.createPurchase(supabaseUserId, request(line(item.getItemId(), 1)))
        );

        assertEquals("Insufficient gold.", exception.getMessage());
        verify(repository, never()).save(any(Purchase.class));
    }

    @Test
    void createPurchase_CreatesLinesDeductsGoldUpdatesInventoryAndEmitsEvent() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), 100);
        Item sword = item(UUID.randomUUID(), 25f);
        Item potion = item(UUID.randomUUID(), 10f);
        Purchase savedPurchase = Purchase.builder().purchase_id(UUID.randomUUID()).learner(learner).total_cost(35f).build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(sword.getItemId())).thenReturn(Optional.of(sword));
        when(itemRepository.findById(potion.getItemId())).thenReturn(Optional.of(potion));
        when(repository.save(any(Purchase.class))).thenReturn(savedPurchase);
        when(learnerInventoryRepository.findByLearnerLearnerIdAndItemItemId(eq(learner.getLearnerId()), eq(sword.getItemId()))).thenReturn(Optional.empty());
        when(learnerInventoryRepository.findByLearnerLearnerIdAndItemItemId(eq(learner.getLearnerId()), eq(potion.getItemId()))).thenReturn(Optional.empty());
        when(learnerInventoryRepository.save(any(LearnerInventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(purchaseLineRepository.save(any(PurchaseLine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Purchase result = service.createPurchase(supabaseUserId, request(line(sword.getItemId(), 1), line(potion.getItemId(), 1)));

        assertEquals(savedPurchase.getPurchase_id(), result.getPurchase_id());
        assertEquals(65, learner.getGold());
        verify(purchaseLineRepository, org.mockito.Mockito.times(2)).save(any(PurchaseLine.class));
        verify(learnerInventoryRepository, org.mockito.Mockito.times(2)).save(any(LearnerInventory.class));
        verify(eventPublisher).publishEvent(any(PurchaseCompletedEvent.class));
    }

    @Test
    void createPurchase_CoercesNonPositiveQuantityAndTreatsNullPriceAsZero() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner(UUID.randomUUID(), 5);
        Item item = item(UUID.randomUUID(), null);
        Purchase savedPurchase = Purchase.builder().purchase_id(UUID.randomUUID()).learner(learner).total_cost(0f).build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(item.getItemId())).thenReturn(Optional.of(item));
        when(repository.save(any(Purchase.class))).thenReturn(savedPurchase);
        when(learnerInventoryRepository.findByLearnerLearnerIdAndItemItemId(eq(learner.getLearnerId()), eq(item.getItemId()))).thenReturn(Optional.empty());
        when(learnerInventoryRepository.save(any(LearnerInventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(purchaseLineRepository.save(any(PurchaseLine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Purchase result = service.createPurchase(supabaseUserId, request(line(item.getItemId(), 0)));

        assertEquals(0f, result.getTotal_cost());
        assertEquals(5, learner.getGold());
        verify(purchaseLineRepository).save(any(PurchaseLine.class));
        verify(eventPublisher).publishEvent(any(PurchaseCompletedEvent.class));
    }

    private Learner learner(UUID learnerId, int gold) {
        Learner learner = new Learner();
        learner.setLearnerId(learnerId);
        learner.setSupabaseUserId(UUID.randomUUID());
        learner.setUsername("learner");
        learner.setEmail("learner@example.com");
        learner.setFull_name("Learner");
        learner.setGold(gold);
        learner.setIs_active(true);
        return learner;
    }

    private Item item(UUID itemId, Float price) {
        return Item.builder()
                .itemId(itemId)
                .name("Item")
                .price(price)
                .is_active(true)
                .build();
    }

    private PurchaseRequest request(PurchaseRequest.Line... lines) {
        PurchaseRequest request = new PurchaseRequest();
        request.setLines(List.of(lines));
        return request;
    }

    private PurchaseRequest.Line line(UUID itemId, int quantity) {
        PurchaseRequest.Line line = new PurchaseRequest.Line();
        line.setItemId(itemId);
        line.setQuantity(quantity);
        return line;
    }
}
