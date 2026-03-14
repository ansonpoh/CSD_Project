package com.smu.csd.economy.purchase;


import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.economy.item.Item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "economy", name = "purchase_line")
public class PurchaseLine {
    @Id
    @UuidGenerator
    private UUID purchase_line_id;
    @ManyToOne
    @JoinColumn(name = "purchase_id", nullable = false)
    private Purchase purchase;
    @ManyToOne
    @JoinColumn(name ="item_id", nullable = false)
    private Item item;
    @Column
    private Integer quantity;
    @Column
    private Float unit_price;
}
