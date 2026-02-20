package com.smu.csd.economy.item;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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
@Table(schema = "economy", name = "items")
public class Item {
    @Id
    @UuidGenerator
    @Column(name = "item_id")
    private UUID itemId;
    @Column
    private String item_type;
    @Column
    private String name;
    @Column
    private String description;
    @Column
    private Float price;
    @Column
    private Boolean is_active;

}
