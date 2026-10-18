package com.arkanos.ams.plugins

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.arkanos.ams.MainActivity

/**
 * Plugin Capacitor personnalisé d'A.MS.
 *
 * Étape 2 :
 *  - isNativeAvailable / getDeviceInfo : réels ;
 *  - pickFolder : Storage Access Framework (Android 11+) ;
 *  - scanLibrary : parcours réel du dossier (DocumentFile),
 *    formats MP3/M4A/AAC/FLAC/OGG/WAV ;
 *  - notify : notification locale réelle, canal « décisions »,
 *    ouverture de l'écran du morceau concerné ;
 *  - getPendingRoute : route en attente après clic notification ;
 *  - schedulePeriodicSync : WorkManager (étape 3).
 */
@CapacitorPlugin(name = "AmsNative")
class AmsNativePlugin : Plugin() {

    companion object {
        const val CHANNEL_DECISIONS = "ams_decisions"
        private const val REQUEST_PICK_FOLDER = 41001
        private const val PREFS = "ams_prefs"
        private const val KEY_PENDING_ROUTE = "pendingRoute"
        private const val KEY_PENDING_TRACK_REF = "pendingTrackRef"
        private const val KEY_LAST_FOLDER = "lastFolder"
    }

    private var pendingFolderCall: PluginCall? = null

    private val audioExtensions =
        setOf(".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wav")

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
        }
        call.resolve(result)
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

    private fun walk(directory: DocumentFile, out: JSONArray) {
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

    /* ---------------- Arrière-plan (étape 3) ---------------- */

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun schedulePeriodicSync(call: PluginCall) {
        call.reject(
            "BACKGROUND_NOT_IMPLEMENTED : WorkManager sera branché à l'étape 3."
        )
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
