package com.smu.csd.economy.purchase;

import java.util.UUID;

public record PurchaseCompletedEvent(
    UUID learnerId,
    UUID purchaseId,
    Float totalCost
) {}
