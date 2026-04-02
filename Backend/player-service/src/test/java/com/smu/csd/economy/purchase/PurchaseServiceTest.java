package com.smu.csd.economy.purchase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.smu.csd.economy.inventory.LearnerInventory;
import com.smu.csd.economy.inventory.LearnerInventoryRepository;
import com.smu.csd.economy.item.Item;
import com.smu.csd.economy.item.ItemRepository;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {

    @Mock
    private PurchaseRepository purchaseRepository;
    @Mock
    private PurchaseLineRepository purchaseLineRepository;
    @Mock
    private LearnerRepository learnerRepository;
    @Mock
    private ItemRepository itemRepository;
    @Mock
    private LearnerInventoryRepository learnerInventoryRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PurchaseService purchaseService;

    private UUID supabaseUserId;
    private UUID learnerId;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        learnerId = UUID.randomUUID();
    }

    @Test
    void createPurchase_throwsWhenLearnerMissing() {
        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(null);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> purchaseService.createPurchase(supabaseUserId, request(line(UUID.randomUUID(), 1))));

        assertEquals("Learner not found.", ex.getMessage());
    }

    @Test
    void createPurchase_throwsWhenGoldInsufficientAfterRounding() {
        Learner learner = learner(learnerId, supabaseUserId, 10);
        UUID itemId = UUID.randomUUID();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(itemId)).thenReturn(Optional.of(item(itemId, 10.6f)));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> purchaseService.createPurchase(supabaseUserId, request(line(itemId, 1))));

        assertEquals("Insufficient gold.", ex.getMessage());
        verify(learnerRepository, never()).save(any(Learner.class));
    }

    @Test
    void createPurchase_clampsQuantityToMinimumOne_andNullPriceToZero() {
        Learner learner = learner(learnerId, supabaseUserId, 50);
        UUID freeItemId = UUID.randomUUID();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(purchaseRepository.save(any(Purchase.class))).thenAnswer(invocation -> {
            Purchase purchase = invocation.getArgument(0);
            purchase.setPurchase_id(UUID.randomUUID());
            return purchase;
        });
        when(itemRepository.findById(freeItemId)).thenReturn(Optional.of(item(freeItemId, null)));
        when(learnerInventoryRepository.findByLearnerLearnerIdAndItemItemId(learnerId, freeItemId))
                .thenReturn(Optional.empty());

        Purchase purchase = purchaseService.createPurchase(supabaseUserId, request(line(freeItemId, 0)));

        assertEquals(0.0f, purchase.getTotal_cost());
        assertEquals(50, learner.getGold());

        ArgumentCaptor<PurchaseLine> lineCaptor = ArgumentCaptor.forClass(PurchaseLine.class);
        verify(purchaseLineRepository).save(lineCaptor.capture());
        assertEquals(1, lineCaptor.getValue().getQuantity());
        assertEquals(0.0f, lineCaptor.getValue().getUnit_price());
    }

    @Test
    void createPurchase_updatesExistingInventory_andPublishesCompletionEvent() {
        Learner learner = learner(learnerId, supabaseUserId, 100);
        UUID itemId = UUID.randomUUID();
        LearnerInventory existingInventory = LearnerInventory.builder()
                .learner(learner)
                .item(item(itemId, 7.2f))
                .quantity(2)
                .is_equipped(false)
                .acquired_at(LocalDateTime.now().minusDays(3))
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(purchaseRepository.save(any(Purchase.class))).thenAnswer(invocation -> {
            Purchase purchase = invocation.getArgument(0);
            purchase.setPurchase_id(UUID.randomUUID());
            return purchase;
        });
        when(itemRepository.findById(itemId)).thenReturn(Optional.of(item(itemId, 7.2f)));
        when(learnerInventoryRepository.findByLearnerLearnerIdAndItemItemId(learnerId, itemId))
                .thenReturn(Optional.of(existingInventory));

        Purchase purchase = purchaseService.createPurchase(supabaseUserId, request(line(itemId, 2)));

        assertEquals(14.4f, purchase.getTotal_cost());
        assertEquals(86, learner.getGold());

        ArgumentCaptor<LearnerInventory> inventoryCaptor = ArgumentCaptor.forClass(LearnerInventory.class);
        verify(learnerInventoryRepository).save(inventoryCaptor.capture());
        assertEquals(4, inventoryCaptor.getValue().getQuantity());

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());
        PurchaseCompletedEvent event = (PurchaseCompletedEvent) eventCaptor.getValue();
        assertEquals(learnerId, event.learnerId());
        assertEquals(purchase.getPurchase_id(), event.purchaseId());
        assertEquals(purchase.getTotal_cost(), event.totalCost());
    }

    private static PurchaseRequest request(PurchaseRequest.Line... lines) {
        PurchaseRequest request = new PurchaseRequest();
        request.setLines(List.of(lines));
        return request;
    }

    private static PurchaseRequest.Line line(UUID itemId, int quantity) {
        PurchaseRequest.Line line = new PurchaseRequest.Line();
        line.setItemId(itemId);
        line.setQuantity(quantity);
        return line;
    }

    private static Learner learner(UUID learnerId, UUID supabaseUserId, int gold) {
        return Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .gold(gold)
                .is_active(true)
                .build();
    }

    private static Item item(UUID itemId, Float price) {
        return Item.builder()
                .itemId(itemId)
                .name("Item")
                .price(price)
                .is_active(true)
                .build();
    }
}
