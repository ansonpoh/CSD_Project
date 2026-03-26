package com.smu.csd.maps;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import com.smu.csd.roles.Contributor;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "maps", name = "map_draft")
public class MapDraft {
    @Id
    @UuidGenerator
    @Column(name = "map_draft_id")
    private UUID mapDraftId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_id", referencedColumnName = "contributor_id")
    private Contributor contributor;

    @Column
    private String name;

    @Column
    private String description;

    @Column
    private String biome;

    @Column
    private String difficulty;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "map_data", columnDefinition = "jsonb")
    private JsonNode mapData;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
