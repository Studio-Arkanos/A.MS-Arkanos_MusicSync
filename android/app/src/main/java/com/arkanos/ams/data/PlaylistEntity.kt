package com.arkanos.ams.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Playlist analysée (configuration + dernière analyse). */
@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey val sourceId: String,
    val name: String,
    val url: String,
    val analyzedAt: String?,
    val itemCount: Int,
)
