package com.smu.csd.npcs;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

public class DialogueLine {
    @Id
    @UuidGenerator
    private UUID dialogue_line_id;
    @ManyToOne
    @JoinColumn(name = "dialogue_id")
    private Dialogue dialogue;
    @Column
    private Integer line_index;
    @Column
    private String text;
    @Column
    private String trigger_condition;
}
