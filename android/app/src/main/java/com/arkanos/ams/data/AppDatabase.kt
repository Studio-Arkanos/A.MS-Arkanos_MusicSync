package com.arkanos.ams.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Base de données locale d'A.MS (Room / SQLite).
 *
 * Étape 2 : schéma complet (morceaux, exclusions, décisions
 * en attente, playlists). Le pont web ↔ Room via le plugin
 * AmsNative sera câblé à l'étape 3 ; l'interface web persiste
 * entre-temps dans le localStorage de la WebView.
 */
@Database(
    entities = [
        TrackEntity::class,
        ExclusionEntity::class,
        PendingDecisionEntity::class,
        PlaylistEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun trackDao(): TrackDao
    abstract fun exclusionDao(): ExclusionDao
    abstract fun pendingDecisionDao(): PendingDecisionDao
    abstract fun playlistDao(): PlaylistDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "ams.db",
                ).fallbackToDestructiveMigration()
                    .build()
                    .also { instance = it }
            }
    }
}
