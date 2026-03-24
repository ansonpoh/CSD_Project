package com.smu.csd.economy.purchase;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PurchaseRequest {
    @NotEmpty
    @Valid
    List<Line> lines;

    @Data
    public static class Line {
        @NotNull
        private UUID itemId;

        @NotNull
        @Min(1)
        private Integer quantity;
    }
}
