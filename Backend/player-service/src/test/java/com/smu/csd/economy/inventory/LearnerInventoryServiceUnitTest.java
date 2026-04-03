package com.smu.csd.economy.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.smu.csd.economy.item.Item;
import com.smu.csd.economy.item.ItemRepository;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;

class LearnerInventoryServiceUnitTest {

    private LearnerInventoryRepository repository;
    private LearnerRepository learnerRepository;
    private ItemRepository itemRepository;
    private LearnerInventoryService service;

    @BeforeEach
    void setUp() {
        repository = mock(LearnerInventoryRepository.class);
        learnerRepository = mock(LearnerRepository.class);
        itemRepository = mock(ItemRepository.class);
        service = new LearnerInventoryService(repository, learnerRepository, itemRepository);
    }

    @Test
    void getMyInventory_MapsLearnerInventoryEntitiesIntoResponseDtosWithItemDetails() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        Item item = item("Potion");
        LearnerInventory inventory = LearnerInventory.builder()
                .learner_inventory_id(UUID.randomUUID())
                .learner(learner)
                .item(item)
                .quantity(3)
                .is_equipped(true)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerId(learner.getLearnerId())).thenReturn(List.of(inventory));

        List<InventoryItemResponse> result = service.getMyInventory(supabaseUserId);

        assertEquals(1, result.size());
        assertEquals(item.getItemId(), result.get(0).getItemId());
        assertEquals("Potion", result.get(0).getName());
        assertEquals(3, result.get(0).getQuantity());
        assertTrue(result.get(0).getIs_equipped());
    }

    @Test
    void addOrIncrement_CreatesNewInventoryRowWithDefaultQuantityOneWhenQuantityIsNull() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        Item item = item("Potion");
        InventoryRequest request = new InventoryRequest();
        request.setItemId(item.getItemId());
        request.setQuantity(null);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(item.getItemId())).thenReturn(Optional.of(item));
        when(repository.findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), item.getItemId())).thenReturn(Optional.empty());
        when(repository.save(any(LearnerInventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findByLearnerLearnerId(learner.getLearnerId())).thenReturn(List.of(
                LearnerInventory.builder()
                        .learner_inventory_id(UUID.randomUUID())
                        .learner(learner)
                        .item(item)
                        .quantity(1)
                        .is_equipped(false)
                        .build()
        ));

        List<InventoryItemResponse> result = service.addOrIncrement(supabaseUserId, request);

        ArgumentCaptor<LearnerInventory> captor = ArgumentCaptor.forClass(LearnerInventory.class);
        verify(repository).save(captor.capture());
        assertEquals(1, captor.getValue().getQuantity());
        assertEquals(1, result.get(0).getQuantity());
    }

    @Test
    void addOrIncrement_IncrementsQuantityOnExistingInventoryRow() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        Item item = item("Potion");
        LearnerInventory inventory = LearnerInventory.builder()
                .learner_inventory_id(UUID.randomUUID())
                .learner(learner)
                .item(item)
                .quantity(2)
                .is_equipped(false)
                .build();
        InventoryRequest request = new InventoryRequest();
        request.setItemId(item.getItemId());
        request.setQuantity(3);

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(itemRepository.findById(item.getItemId())).thenReturn(Optional.of(item));
        when(repository.findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), item.getItemId())).thenReturn(Optional.of(inventory));
        when(repository.save(any(LearnerInventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findByLearnerLearnerId(learner.getLearnerId())).thenReturn(List.of(inventory));

        service.addOrIncrement(supabaseUserId, request);

        assertEquals(5, inventory.getQuantity());
    }

    @Test
    void removeOrDecrement_DeletesInventoryRowWhenQuantityReachesZeroOrBelow() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        Item item = item("Potion");
        LearnerInventory inventory = LearnerInventory.builder()
                .learner_inventory_id(UUID.randomUUID())
                .learner(learner)
                .item(item)
                .quantity(1)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), item.getItemId())).thenReturn(Optional.of(inventory));
        when(repository.findByLearnerLearnerId(learner.getLearnerId())).thenReturn(List.of());

        List<InventoryItemResponse> result = service.removeOrDecrement(supabaseUserId, item.getItemId(), 2);

        verify(repository).delete(inventory);
        assertTrue(result.isEmpty());
    }

    @Test
    void removeOrDecrement_DecrementsQuantityAndKeepsRowWhenItemsRemain() {
        UUID supabaseUserId = UUID.randomUUID();
        Learner learner = learner();
        Item item = item("Potion");
        LearnerInventory inventory = LearnerInventory.builder()
                .learner_inventory_id(UUID.randomUUID())
                .learner(learner)
                .item(item)
                .quantity(4)
                .is_equipped(false)
                .build();

        when(learnerRepository.findBySupabaseUserId(supabaseUserId)).thenReturn(learner);
        when(repository.findByLearnerLearnerIdAndItemItemId(learner.getLearnerId(), item.getItemId())).thenReturn(Optional.of(inventory));
        when(repository.save(any(LearnerInventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findByLearnerLearnerId(learner.getLearnerId())).thenReturn(List.of(inventory));

        List<InventoryItemResponse> result = service.removeOrDecrement(supabaseUserId, item.getItemId(), 2);

        assertEquals(2, inventory.getQuantity());
        assertFalse(result.isEmpty());
        assertEquals(2, result.get(0).getQuantity());
    }

    private Learner learner() {
        return Learner.builder().learnerId(UUID.randomUUID()).supabaseUserId(UUID.randomUUID()).username("learner").is_active(true).build();
    }

    private Item item(String name) {
        return Item.builder().itemId(UUID.randomUUID()).name(name).description("desc").item_type("consumable").price(10f).build();
    }
}
