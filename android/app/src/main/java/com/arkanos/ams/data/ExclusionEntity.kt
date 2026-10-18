package com.arkanos.ams.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Exclusion manuelle de l'utilisateur.
 * Identité stable : (sourceId, trackRef) — survit à une
 * nouvelle analyse de playlist. Une exclusion ne supprime
JAMAIS la chanson de la playlist source.
 */
@Entity(
    tableName = "exclusions",
    indices = [Index(value = ["sourceId", "trackRef"], unique = true)]
)
data class ExclusionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sourceId: String,
    val trackRef: String,
    val title: String,
    val artist: String,
    val excludedAt: String,
)
