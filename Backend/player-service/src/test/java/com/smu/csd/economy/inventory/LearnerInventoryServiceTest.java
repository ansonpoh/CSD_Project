package com.smu.csd.economy.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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

import com.smu.csd.economy.item.Item;
import com.smu.csd.economy.item.ItemRepository;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

@ExtendWith(MockitoExtension.class)
class LearnerInventoryServiceTest {

    @Mock
    private LearnerInventoryRepository repository;

    @Mock
    private LearnerRepository learnerRepository;

    @Mock
    private ItemRepository itemRepository;

    @InjectMocks
    private LearnerInventoryService service;

    private UUID supabaseUserId;
    private UUID learnerId;
    private UUID itemId;
    private Learner learner;
    private Item item;

    @BeforeEach
    void setUp() {
        supabaseUserId = UUID.randomUUID();
        learnerId = UUID.randomUUID();
        itemId = UUID.randomUUID();

        learner = Learner.builder()
                .learnerId(learnerId)
                .supabaseUserId(supabaseUserId)
                .username("alice")
                .email("alice@example.com")
                .is_active(true)
                .build();

        item = Item.builder()
                .itemId(itemId)
                .item_type("consumable")
                .name("Potion")
                .description("Restores HP")
                .price(12.5f)
                .is_active(true)
                .build();
    }

    @Test
    void getMyInventory_mapsInventoryEntityToResponseDto() {
        LearnerInventory inventory = LearnerInventory.builder()
                .learner_inventory_id(UUID.randomUUID())
                .learner(learner)
                .item(item)
                .quantity(3)
                .is_equipped(false)
                .acquired_at(LocalDateTime.now().minusDays(1))
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerId(learnerId)).thenReturn(List.of(inventory));

        List<InventoryItemResponse> response = service.getMyInventory(supabaseUserId);

        assertEquals(1, response.size());
        assertEquals(itemId, response.get(0).getItemId());
        assertEquals("Potion", response.get(0).getName());
        assertEquals(3, response.get(0).getQuantity());
    }

    @Test
    void addOrIncrement_clampsQuantityToOneForNonPositiveRequest() {
        InventoryRequest request = new InventoryRequest();
        request.setItemId(itemId);
        request.setQuantity(0);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(repository.findByLearnerLearnerIdAndItemItemId(learnerId, itemId)).thenReturn(Optional.empty());
        when(repository.findByLearnerLearnerId(learnerId)).thenReturn(List.of(
                LearnerInventory.builder()
                        .learner_inventory_id(UUID.randomUUID())
                        .learner(learner)
                        .item(item)
                        .quantity(1)
                        .is_equipped(false)
                        .build()
        ));

        List<InventoryItemResponse> response = service.addOrIncrement(supabaseUserId, request);

        ArgumentCaptor<LearnerInventory> inventoryCaptor = ArgumentCaptor.forClass(LearnerInventory.class);
        verify(repository).save(inventoryCaptor.capture());
        assertEquals(1, inventoryCaptor.getValue().getQuantity());
        assertEquals(false, inventoryCaptor.getValue().getIs_equipped());
        assertEquals(1, response.get(0).getQuantity());
    }

    @Test
    void addOrIncrement_throwsWhenItemMissing() {
        InventoryRequest request = new InventoryRequest();
        request.setItemId(itemId);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(itemId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.addOrIncrement(supabaseUserId, request));

        assertEquals("Item not found.", ex.getMessage());
        verify(repository, never()).save(any(LearnerInventory.class));
    }

    @Test
    void removeOrDecrement_deletesInventoryWhenRemainingIsZeroOrLess() {
        LearnerInventory existing = LearnerInventory.builder()
                .learner(learner)
                .item(item)
                .quantity(2)
                .is_equipped(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndItemItemId(learnerId, itemId)).thenReturn(Optional.of(existing));
        when(repository.findByLearnerLearnerId(learnerId)).thenReturn(List.of());

        List<InventoryItemResponse> response = service.removeOrDecrement(supabaseUserId, itemId, 3);

        verify(repository).delete(existing);
        verify(repository, never()).save(any(LearnerInventory.class));
        assertEquals(0, response.size());
    }

    @Test
    void removeOrDecrement_clampsInvalidRemovalQuantityToOneAndSavesRemainder() {
        LearnerInventory existing = LearnerInventory.builder()
                .learner(learner)
                .item(item)
                .quantity(5)
                .is_equipped(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndItemItemId(learnerId, itemId)).thenReturn(Optional.of(existing));
        when(repository.findByLearnerLearnerId(learnerId)).thenReturn(List.of(
                LearnerInventory.builder()
                        .learner_inventory_id(UUID.randomUUID())
                        .learner(learner)
                        .item(item)
                        .quantity(4)
                        .is_equipped(false)
                        .build()
        ));

        List<InventoryItemResponse> response = service.removeOrDecrement(supabaseUserId, itemId, 0);

        ArgumentCaptor<LearnerInventory> inventoryCaptor = ArgumentCaptor.forClass(LearnerInventory.class);
        verify(repository).save(inventoryCaptor.capture());
        assertEquals(4, inventoryCaptor.getValue().getQuantity());
        assertEquals(4, response.get(0).getQuantity());
    }
}
