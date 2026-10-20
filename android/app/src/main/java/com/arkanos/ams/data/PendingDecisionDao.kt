package com.arkanos.ams.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingDecisionDao {

    @Query("SELECT * FROM pending_decisions WHERE resolved = 0")
    fun observePending(): Flow<List<PendingDecisionEntity>>

    @Query("SELECT * FROM pending_decisions ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<PendingDecisionEntity>>

    @Query(
        "SELECT resolution FROM pending_decisions " +
            "WHERE sourceId = :sourceId AND trackRef = :trackRef AND resolved = 1 " +
            "ORDER BY resolvedAt DESC LIMIT 1"
    )
    suspend fun resolutionFor(sourceId: String, trackRef: String): String?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(decision: PendingDecisionEntity): Long

    @Update
    suspend fun update(decision: PendingDecisionEntity)
}
