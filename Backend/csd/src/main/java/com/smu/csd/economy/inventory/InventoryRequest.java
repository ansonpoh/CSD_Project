package com.smu.csd.economy.inventory;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InventoryRequest {
    @NotNull
    private UUID itemId;

    @Min(1)
    private Integer quantity = 1;

    private Boolean isEquipped;
}
