package com.arkanos.ams.plugins

import android.app.Activity
import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.arkanos.ams.AmsScanWorker
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.PermissionCallback
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.arkanos.ams.MainActivity
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Plugin Capacitor personnalisé d'A.MS.
 *
 *  - isNativeAvailable / getDeviceInfo : réels ;
 *  - pickFolder : Storage Access Framework (Android 11+) ;
 *  - scanLibrary : parcours réel (DocumentFile),
 *    MP3/M4A/AAC/FLAC/OGG/WAV ;
 *  - notify : notification locale réelle (canal « décisions »,
 *    deep-link vers l'écran du morceau) ;
 *  - requestNotificationPermission : demande runtime
 *    POST_NOTIFICATIONS (Android 13+) ;
 *  - getPendingRoute : route en attente après notification ;
 *  - enqueueDownload / getDownloadStatus / cancelDownload :
 *    moteur de téléchargement réel via Android DownloadManager
 *    (reprise sur interruption gérée par le système) ;
 *  - fileExists : prévention de l'écrasement ;
 *  - openUrl : ouverture de la source (navigateur / appli) ;
 *  - probeUrl : sonde HEAD (type de contenu) pour l'import d'URL ;
 *  - schedulePeriodicSync / cancelPeriodicSync /
 *    isPeriodicSyncScheduled : WorkManager réel (analyse
 *    périodique de la bibliothèque, contraintes réseau +
 *    batterie). Intervalle minimal honnête : 12 h
 *    (WorkManager n'autorise pas moins de 15 min, et
 *    aucune heure exacte n'est garantie par Android).
 */
@CapacitorPlugin(
    name = "AmsNative",
    permissions = [
        Permission(
            alias = AmsNativePlugin.NOTIFICATIONS_ALIAS,
            strings = [android.Manifest.permission.POST_NOTIFICATIONS],
        ),
    ],
)
class AmsNativePlugin : Plugin() {

    companion object {
        const val CHANNEL_DECISIONS = "ams_decisions"
        private const val CHANNEL_BACKGROUND = "ams_background"
        private const val REQUEST_PICK_FOLDER = 41001
        internal const val NOTIFICATIONS_ALIAS = "notifications"
        internal const val PREFS = "ams_prefs"
        const val KEY_PENDING_ROUTE = "pendingRoute"
        const val KEY_PENDING_TRACK_REF = "pendingTrackRef"
        private const val KEY_LAST_FOLDER = "lastFolder"
        private const val KEY_SCAN_FOLDER = "scanFolder"
        private const val UNIQUE_SCAN_WORK = "ams_periodic_scan"
        private const val SCAN_INTERVAL_HOURS = 12L
    }

    private val audioExtensions =
        setOf(".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wav")

    private var pendingFolderCall: PluginCall? = null

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun isNativeAvailable(call: PluginCall) {
        val result = JSObject().apply {
            put("available", true)
            put("platform", "android")
        }
        call.resolve(result)
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun getDeviceInfo(call: PluginCall) {
        val result = JSObject().apply {
            put("platform", "android")
            put("version", Build.VERSION.RELEASE)
            put("sdkInt", Build.VERSION.SDK_INT)
        }
        call.resolve(result)
    }

    /** État réel de la permission POST_NOTIFICATIONS (sans demander). */
    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun getNotificationPermissionStatus(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true // Android < 13 : la permission n'existe pas
        }
        call.resolve(JSObject().apply { put("granted", granted) })
    }

    /* ---------------- Notifications réelles ---------------- */

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun notify(call: PluginCall) {
        val title = call.getString("title") ?: "A.MS"
        val message = call.getString("message") ?: ""
        val route = call.getString("route")
        val trackRef = call.getString("trackRef")

        // Android 13+ : permission POST_NOTIFICATIONS.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!granted) {
                call.reject("NOTIFICATIONS_PERMISSION_DENIED")
                return
            }
        }

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE)
            as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_DECISIONS,
                "Décisions A.MS",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Correspondances incertaines et décisions en attente"
            }
            manager.createNotificationChannel(channel)
        }

        // Le clic ouvre l'écran du morceau concerné (deep-link web).
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra(KEY_PENDING_ROUTE, route ?: "/historique")
            putExtra(KEY_PENDING_TRACK_REF, trackRef ?: "")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_DECISIONS)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(message)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        val notificationId = System.currentTimeMillis().toInt()
        manager.notify(notificationId, notification)

        // « delivered » n'est vrai QUE parce que notify() a réussi.
        val result = JSObject().apply {
            put("delivered", true)
            put("id", notificationId)
        }
        call.resolve(result)
    }

    /* ---------------- Permission notifications (Android 13+) ---------------- */

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun requestNotificationPermission(call: PluginCall) {
        // Android < 13 : la permission n'existe pas, elle est acquise.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(JSObject().apply { put("granted", true) })
            return
        }
        if (getPermissionState(android.Manifest.permission.POST_NOTIFICATIONS) ==
            PermissionState.GRANTED
        ) {
            call.resolve(JSObject().apply { put("granted", true) })
            return
        }
        requestPermissionForAlias(
            NOTIFICATIONS_ALIAS,
            call,
            "onNotificationPermissionResult",
        )
    }

    @PermissionCallback
    private fun onNotificationPermissionResult(call: PluginCall) {
        val granted = getPermissionState(android.Manifest.permission.POST_NOTIFICATIONS) ==
            PermissionState.GRANTED
        call.resolve(JSObject().apply { put("granted", granted) })
    }

    /* ---------------- Dossier (Storage Access Framework) ---------------- */

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun pickFolder(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        try {
            pendingFolderCall = call
            getActivity().startActivityForResult(intent, REQUEST_PICK_FOLDER)
        } catch (e: Exception) {
            pendingFolderCall = null
            call.reject("PICK_FOLDER_FAILED: ${e.message}")
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun getLastFolder(call: PluginCall) {
        val uri = prefs().getString(KEY_LAST_FOLDER, null)
        val result = JSObject().apply { put("uri", uri ?: "") }
        call.resolve(result)
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun scanLibrary(call: PluginCall) {
        val folderUri = call.getString("folderUri")
        if (folderUri.isNullOrBlank()) {
            call.reject("SCAN_MISSING_FOLDER: aucun dossier indiqué.")
            return
        }
        // Mémorisation native : le worker WorkManager peut
        // relancer l'analyse sans l'interface web.
        prefs().edit().putString(KEY_SCAN_FOLDER, folderUri).apply()
        try {
            val tree = DocumentFile.fromTreeUri(context, Uri.parse(folderUri))
            if (tree == null || !tree.exists()) {
                call.reject("SCAN_FOLDER_INACCESSIBLE: dossier inaccessible (permission révoquée ?).")
                return
            }
            val files = JSArray()
            walk(tree, files)
            val result = JSObject().apply {
                put("files", files)
                put("count", files.length())
            }
            call.resolve(result)
        } catch (e: SecurityException) {
            call.reject("SCAN_PERMISSION_DENIED: ${e.message}")
        } catch (e: Exception) {
            call.reject("SCAN_ERROR: ${e.message}")
        }
    }

    private fun walk(directory: DocumentFile, out: JSArray) {
        val children = directory.listFiles() ?: return
        for (document in children) {
            if (document.isDirectory) {
                walk(document, out)
            } else if (isAudio(document.name)) {
                val file = JSObject()
                file.put("name", document.name ?: "")
                file.put("uri", document.uri.toString())
                file.put("sizeBytes", document.length())
                file.put("mimeType", document.type ?: "")
                out.put(file)
            }
        }
    }

    private fun isAudio(name: String?): Boolean {
        if (name == null) return false
        val lower = name.lowercase()
        return audioExtensions.any { lower.endsWith(it) }
    }

    /* ---------------- Moteur de téléchargement (DownloadManager) ---------------- */

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun enqueueDownload(call: PluginCall) {
        val url = call.getString("url")
        val title = call.getString("title") ?: ""
        val artist = call.getString("artist") ?: ""
        val displayName = call.getString("displayName")
        val folderUri = call.getString("folderUri")

        if (url.isNullOrBlank() || displayName.isNullOrBlank()) {
            call.reject("DOWNLOAD_MISSING_PARAMS: url et displayName requis.")
            return
        }

        try {
            val request = DownloadManager.Request(Uri.parse(url))
            request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            )
            request.setTitle(title.ifBlank { displayName })
            request.setDescription(artist)
            request.setAllowedNetworkTypes(
                DownloadManager.Request.NETWORK_WIFI or
                    DownloadManager.Request.NETWORK_MOBILE
            )
            request.setAllowedOverMetered(true)
            request.setAllowedOverRoaming(false)

            val destination: Uri? =
                if (folderUri != null) {
                    // Écriture sécurisée dans le dossier SAF choisi.
                    val tree = DocumentFile.fromTreeUri(context, Uri.parse(folderUri))
                    if (tree == null || !tree.exists()) {
                        call.reject("DOWNLOAD_FOLDER_INACCESSIBLE")
                        return
                    }
                    // Anti-écrasement : refus natif si la cible existe.
                    if (tree.findFile(displayName) != null) {
                        call.reject("DOWNLOAD_TARGET_EXISTS: $displayName existe déjà.")
                        return
                    }
                    val created = tree.createFile("audio/*", displayName)
                    if (created == null) {
                        call.reject("DOWNLOAD_CREATE_FILE_FAILED: $displayName")
                        return
                    }
                    created.uri
                } else null

            if (destination != null) {
                request.setDestinationUri(destination)
            } else {
                request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    displayName
                )
            }
            request.setMimeType("audio/*")

            val manager = context.getSystemService(Context.DOWNLOAD_SERVICE)
                as DownloadManager
            val nativeId = manager.enqueue(request)
            val result = JSObject().apply { put("nativeId", nativeId) }
            call.resolve(result)
        } catch (e: SecurityException) {
            call.reject("DOWNLOAD_PERMISSION_DENIED: ${e.message}")
        } catch (e: Exception) {
            call.reject("DOWNLOAD_ENQUEUE_FAILED: ${e.message}")
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun getDownloadStatus(call: PluginCall) {
        val nativeId = call.getLong("nativeId") ?: run {
            call.reject("DOWNLOAD_MISSING_ID")
            return
        }
        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE)
            as DownloadManager
        val cursor = manager.query(DownloadManager.Query().setFilterById(nativeId))
        cursor.use {
            if (!it.moveToFirst()) {
                call.reject("DOWNLOAD_NOT_FOUND")
                return
            }
            val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            val reasonColumn = it.getColumnIndex(DownloadManager.COLUMN_REASON)
            val reason = if (reasonColumn >= 0 && !it.isNull(reasonColumn)) {
                it.getString(reasonColumn) ?: ""
            } else ""
            val bytesColumn = it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
            val totalColumn = it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
            val uriColumn = it.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
            val mediaTypeColumn = it.getColumnIndex(DownloadManager.COLUMN_MEDIA_TYPE)

            val bytesReceived = it.getLong(bytesColumn)
            val totalBytes = it.getLong(totalColumn)
            val localUri = if (uriColumn >= 0 && !it.isNull(uriColumn)) it.getString(uriColumn) ?: "" else ""
            val mediaType = if (mediaTypeColumn >= 0 && !it.isNull(mediaTypeColumn)) it.getString(mediaTypeColumn) ?: "" else ""
            val progress = if (totalBytes > 0) (bytesReceived * 100 / totalBytes).toInt() else 0

            val statusName = when (status) {
                DownloadManager.STATUS_RUNNING -> "downloading"
                DownloadManager.STATUS_PAUSED -> "paused"
                DownloadManager.STATUS_SUCCESSFUL -> "done"
                DownloadManager.STATUS_FAILED -> "failed"
                DownloadManager.STATUS_PENDING -> "queued"
                else -> "unknown"
            }

            val result = JSObject().apply {
                put("status", statusName)
                put("progressPercent", progress)
                put("bytesReceived", bytesReceived)
                put("totalBytes", totalBytes)
                put("localUri", localUri)
                put("mediaType", mediaType)
                put("reason", reason)
            }
            call.resolve(result)
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun cancelDownload(call: PluginCall) {
        val nativeId = call.getLong("nativeId") ?: run {
            call.reject("DOWNLOAD_MISSING_ID")
            return
        }
        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE)
            as DownloadManager
        val removed = manager.remove(nativeId)
        val result = JSObject().apply { put("cancelled", removed > 0) }
        call.resolve(result)
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun fileExists(call: PluginCall) {
        val folderUri = call.getString("folderUri")
        val name = call.getString("name")
        if (folderUri.isNullOrBlank() || name.isNullOrBlank()) {
            call.reject("FILE_EXISTS_MISSING_PARAMS")
            return
        }
        val tree = DocumentFile.fromTreeUri(context, Uri.parse(folderUri))
        val exists = tree?.findFile(name) != null
        val result = JSObject().apply { put("exists", exists) }
        call.resolve(result)
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun openUrl(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("OPEN_URL_MISSING")
            return
        }
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            val result = JSObject().apply { put("opened", true) }
            call.resolve(result)
        } catch (e: Exception) {
            val result = JSObject().apply {
                put("opened", false)
                put("reason", "OPEN_URL_FAILED: ${e.message}")
            }
            call.resolve(result)
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun probeUrl(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("PROBE_MISSING_URL")
            return
        }
        try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "HEAD"
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            val statusCode = connection.responseCode
            val contentType = connection.contentType ?: ""
            val contentLength = connection.contentLengthLong
            connection.disconnect()
            val result = JSObject().apply {
                put("statusCode", statusCode)
                put("contentType", contentType)
                put("contentLength", contentLength)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("PROBE_FAILED: ${e.message}")
        }
    }

    /* ---------------- Deep-link après notification ---------------- */

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun getPendingRoute(call: PluginCall) {
        val prefs = prefs()
        val route = prefs.getString(KEY_PENDING_ROUTE, "") ?: ""
        val trackRef = prefs.getString(KEY_PENDING_TRACK_REF, "") ?: ""
        // Consommé : une seule navigation par notification.
        prefs.edit().remove(KEY_PENDING_ROUTE).remove(KEY_PENDING_TRACK_REF).apply()
        val result = JSObject().apply {
            put("route", route)
            put("trackRef", trackRef)
        }
        call.resolve(result)
    }

    /* ---------------- Arrière-plan (WorkManager) ---------------- */

    /**
     * Planifie l'analyse périodique réelle de la bibliothèque
     * (WorkManager). Contraintes honnêtes : réseau connecté,
     * batterie non faible. WorkManager ne garantit AUCUNE
     * heure exacte (doze, restrictions OEM) — l'intervalle
     * minimal ici est 12 h, bien au-dessus du minimum
     * système de 15 min, pour préserver la batterie.
     */
    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun schedulePeriodicSync(call: PluginCall) {
        val folderUri = call.getString("folderUri")
            ?: prefs().getString(KEY_SCAN_FOLDER, null)
        if (folderUri.isNullOrBlank()) {
            call.reject("SYNC_NO_FOLDER: aucun dossier de bibliothèque mémorisé.")
            return
        }
        prefs().edit().putString(KEY_SCAN_FOLDER, folderUri).apply()
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
            val request = PeriodicWorkRequestBuilder<AmsScanWorker>(
                SCAN_INTERVAL_HOURS,
                TimeUnit.HOURS,
            )
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_SCAN_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
            val result = JSObject().apply {
                put("scheduled", true)
                put("intervalHours", SCAN_INTERVAL_HOURS)
                put("exact", false) // jamais d'heure exacte promise
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("SYNC_SCHEDULE_FAILED: ${e.message}")
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun cancelPeriodicSync(call: PluginCall) {
        try {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_SCAN_WORK)
            val result = JSObject().apply { put("cancelled", true) }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("SYNC_CANCEL_FAILED: ${e.message}")
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun isPeriodicSyncScheduled(call: PluginCall) {
        try {
            val workInfos = WorkManager.getInstance(context)
                .getWorkInfosForUniqueWork(UNIQUE_SCAN_WORK)
                .get()
            val scheduled = workInfos.any {
                it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.RUNNING
            }
            val result = JSObject().apply { put("scheduled", scheduled) }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("SYNC_STATUS_FAILED: ${e.message}")
        }
    }

    /* ---------------- Résultat SAF ---------------- */

    override fun handleOnActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.handleOnActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_PICK_FOLDER) return
        val call = pendingFolderCall ?: return
        pendingFolderCall = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            call.reject("PICK_FOLDER_CANCELLED: aucun dossier sélectionné.")
            return
        }
        val uri = data.data!!
        try {
            // Autorisation persistante : survit au redémarrage.
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
            prefs().edit().putString(KEY_LAST_FOLDER, uri.toString()).apply()
            val result = JSObject().apply { put("uri", uri.toString()) }
            call.resolve(result)
        } catch (e: SecurityException) {
            call.reject("PICK_FOLDER_PERMISSION: ${e.message}")
        }
    }

    private fun prefs() =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
