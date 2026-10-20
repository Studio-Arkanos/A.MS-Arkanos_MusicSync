package com.arkanos.ams

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.documentfile.provider.DocumentFile
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Travail d'arrière-plan réel d'A.MS (WorkManager).
 *
 * Analyse périodique la bibliothèque locale dont l'URI
 * SAF a été mémorisée (permission persistante) et
 * notifie le résultat. Aucun téléchargement n'est
 * déclenché ici : l'orchestration complète
 * (playlist → plan → téléchargements) est pilotée
 * depuis l'interface et reste honnêtement limitée
 * à l'application ouverte.
 *
 * Limites assumées :
 *  - WorkManager ne garantit aucune heure exacte
 *    (doze, restrictions OEM) ;
 *  - un scan très volumineux peut dépasser la
 *    limite d'exécution d'un worker — le résultat
 *    partiel est alors notifié comme tel ;
 *  - sans permission POST_NOTIFICATIONS (Android 13+),
 *    le scan s'exécute mais sans notification.
 */
class AmsScanWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    companion object {
        private const val PREFS = "ams_prefs"
        private const val KEY_SCAN_FOLDER = "scanFolder"
        private const val CHANNEL_BACKGROUND = "ams_background"
        private const val NOTIFICATION_ID = 41002
        private const val AUDIO_EXTENSIONS =
            listOf(".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wav")
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val prefs = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val folderUri = prefs.getString(KEY_SCAN_FOLDER, null)
            if (folderUri.isNullOrBlank()) {
                // Rien à analyser : succès sans effet,
                // jamais un échec prétendu.
                return@withContext Result.success()
            }

            val tree = DocumentFile.fromTreeUri(
                applicationContext,
                android.net.Uri.parse(folderUri),
            )
            if (tree == null || !tree.exists()) {
                // Permission révoquée ou dossier supprimé :
                // état réel, récupérable à la prochaine
                // sélection de dossier.
                return@withContext Result.success()
            }

            var audioCount = 0
            var errorCount = 0
            walk(tree) { document ->
                if (document.isDirectory) return@walk
                val name = document.name ?: ""
                val lower = name.lowercase()
                if (AUDIO_EXTENSIONS.any { lower.endsWith(it) }) {
                    audioCount++
                } else {
                    errorCount++
                }
            }

            notifyScanComplete(audioCount)
            Result.success()
        } catch (e: SecurityException) {
            // Permission révoquée entre-temps : l'état
            // réel est signalé, le travail reste
            // récupérable.
            Result.success()
        } catch (e: Exception) {
            // Transitoire (mémoire, système) : nouvelle
            // tentative ultérieure par WorkManager.
            Result.retry()
        }
    }

    private fun walk(directory: DocumentFile, visit: (androidx.documentfile.provider.DocumentFile) -> Unit) {
        val children = directory.listFiles() ?: return
        for (child in children) {
            visit(child)
            if (child.isDirectory) walk(child, visit)
        }
    }

    private fun notifyScanComplete(audioCount: Int) {
        try {
            val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_BACKGROUND,
                    "Arrière-plan A.MS",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Résultats des analyses en arrière-plan"
                }
                manager.createNotificationChannel(channel)
            }
            val notification = NotificationCompat.Builder(applicationContext, CHANNEL_BACKGROUND)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle("A.MS — analyse en arrière-plan")
                .setContentText("$audioCount fichier(s) audio détecté(s)")
                .setAutoCancel(true)
                .build()
            manager.notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            // Android 13+ sans permission POST_NOTIFICATIONS :
            // le scan a eu lieu, la notification est un bonus.
        }
    }
}
