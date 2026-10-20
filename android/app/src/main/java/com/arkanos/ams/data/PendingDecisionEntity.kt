package com.arkanos.ams.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Décision en attente (correspondance incertaine).
 * L'utilisateur tranche : « Déjà présent »,
 * « Autoriser le téléchargement » ou « Ignorer ».
 */
@Entity(
    tableName = "pending_decisions",
    indices = [Index(value = ["sourceId", "trackRef"])]
)
data class PendingDecisionEntity(
    @PrimaryKey val id: String,
    val sourceId: String,
    val trackRef: String,
    val title: String,
    val artist: String,
    val kind: String, // "uncertain_match"
    val matchedLocalId: String?,
    val score: Double?,
    val createdAt: String,
    val resolved: Boolean = false,
    val resolution: String?, // "present" | "download" | "ignore"
    val resolvedAt: String?,
)
