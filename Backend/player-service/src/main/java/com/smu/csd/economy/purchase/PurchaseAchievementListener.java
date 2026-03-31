package com.smu.csd.economy.purchase;

import java.util.Map;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.smu.csd.achievements.AchievementService;

@Component
public class PurchaseAchievementListener {
    private final AchievementService achievementService;

    public PurchaseAchievementListener(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPurchaseCompleted(PurchaseCompletedEvent event) {
        achievementService.recordEvent(
            event.learnerId(),
            "purchase_completed",
            1,
            "player-service",
            "purchase_completed:" + event.purchaseId(),
            Map.of(
                "purchase_id", event.purchaseId().toString(),
                "total_cost", event.totalCost()
            )
        );
    }
}
