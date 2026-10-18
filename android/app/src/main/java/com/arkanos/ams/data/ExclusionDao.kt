package com.arkanos.ams.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ExclusionDao {

    @Query("SELECT * FROM exclusions WHERE sourceId = :sourceId")
    fun observeForSource(sourceId: String): Flow<List<ExclusionEntity>>

    @Query("SELECT * FROM exclusions WHERE sourceId = :sourceId AND trackRef = :trackRef")
    suspend fun find(sourceId: String, trackRef: String): ExclusionEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(exclusion: ExclusionEntity): Long

    @Query(
        "DELETE FROM exclusions WHERE sourceId = :sourceId AND trackRef = :trackRef"
    )
    suspend fun remove(sourceId: String, trackRef: String): Int

    @Query("DELETE FROM exclusions WHERE sourceId = :sourceId")
    suspend fun clearForSource(sourceId: String): Int

    @Delete
    suspend fun delete(exclusion: ExclusionEntity)
}
