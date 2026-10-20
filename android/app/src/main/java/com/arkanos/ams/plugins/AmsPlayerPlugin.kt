package com.arkanos.ams.plugins

import android.media.AudioAttributes
import android.media.MediaPlayer
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Lecteur audio natif d'A.MS (MediaPlayer Android).
 *
 * Lit UNIQUEMENT des fichiers locaux :
 *  - morceaux de la bibliothèque scannée (content:// SAF) ;
 *  - morceaux téléchargés depuis des sources autorisées.
 *
 * Aucun flux distant n'est lu (YouTube : ouverture
 * source uniquement — jamais d'extraction).
 */
@CapacitorPlugin(name = "AmsPlayer")
class AmsPlayerPlugin : Plugin() {

    private var mediaPlayer: MediaPlayer? = null
    private var currentUri: String? = null

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun play(call: PluginCall) {
        val uri = call.getString("uri")
        if (uri.isNullOrBlank()) {
            call.reject("PLAY_MISSING_URI")
            return
        }
        try {
            if (mediaPlayer == null || uri != currentUri) {
                release()
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    // Contexte applicatif : survit aux rotations.
                    setDataSource(context.applicationContext, android.net.Uri.parse(uri))
                    prepare()
                    start()
                }
                currentUri = uri
            } else {
                mediaPlayer?.start()
            }
            val result = JSObject().apply {
                put("playing", true)
                put("durationMs", mediaPlayer?.duration ?: 0)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("PLAY_FAILED: ${e.message}")
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun pause(call: PluginCall) {
        mediaPlayer?.pause()
        call.resolve(JSObject().apply { put("paused", true) })
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun stop(call: PluginCall) {
        release()
        call.resolve(JSObject().apply { put("stopped", true) })
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun seekTo(call: PluginCall) {
        val positionMs = call.getInt("positionMs") ?: 0
        mediaPlayer?.seekTo(positionMs)
        call.resolve(JSObject().apply { put("seeked", true) })
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun getStatus(call: PluginCall) {
        val player = mediaPlayer
        val position = try {
            player?.currentPosition ?: 0
        } catch (e: Exception) {
            0
        }
        val duration = try {
            player?.duration ?: 0
        } catch (e: Exception) {
            0
        }
        call.resolve(
            JSObject().apply {
                put("playing", player?.isPlaying ?: false)
                put("positionMs", position)
                put("durationMs", duration)
                put("uri", currentUri ?: "")
            },
        )
    }

    private fun release() {
        mediaPlayer?.reset()
        mediaPlayer?.release()
        mediaPlayer = null
        currentUri = null
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        release()
    }
}
