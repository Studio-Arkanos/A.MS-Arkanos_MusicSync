package com.arkanos.ams.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Morceau persistant (SQLite via Room).
 * Alimenté par le scan local et les décisions de synchronisation (étape 2).
 */
@Entity(tableName = "tracks")
data class TrackEntity(
    @PrimaryKey val id: String,
    val title: String,
    val artist: String,
    val album: String?,
    val durationMs: Long?,
    val source: String, // "local" | "remote"
    val localPath: String?,
    val fingerprint: String,
)
