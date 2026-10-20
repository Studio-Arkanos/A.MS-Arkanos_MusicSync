package com.arkanos.ams.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Accès Room à la table des morceaux.
 * L'interface web (src/modules/database) appellera ce DAO
 * via le plugin AmsNative à l'étape 2.
 */
@Dao
interface TrackDao {

    @Query("SELECT * FROM tracks ORDER BY artist, title")
    fun observeAll(): Flow<List<TrackEntity>>

    @Query("SELECT COUNT(*) FROM tracks")
    suspend fun count(): Int

    @Query("SELECT * FROM tracks WHERE fingerprint = :fingerprint")
    suspend fun findByFingerprint(fingerprint: String): List<TrackEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tracks: List<TrackEntity>)

    @Query("DELETE FROM tracks")
    suspend fun clear()
}
