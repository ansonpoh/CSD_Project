package com.smu.csd.economy.inventory;

import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryItemResponse {
    private UUID learner_inventory_id;
    private UUID itemId;
    private String name;
    private String description;
    private String item_type;
    private Float price;
    private Integer quantity;
    private Boolean is_equipped;
}
