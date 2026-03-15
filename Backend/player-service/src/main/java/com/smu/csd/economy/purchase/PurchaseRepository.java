package com.smu.csd.economy.purchase;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, UUID>{

}