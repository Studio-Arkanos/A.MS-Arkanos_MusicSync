package com.arkanos.ams

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.arkanos.ams.plugins.AmsNativePlugin
import com.arkanos.ams.plugins.AmsPlayerPlugin

/**
 * Point d'entrée natif d'A.MS.
 * - enregistre les plugins Capacitor personnalisés
 *   (AmsNative : médias/téléchargements, AmsPlayer : lecture) ;
 * - capture la route en attente (clic sur une notification)
 *   pour que l'interface ouvre l'écran du morceau concerné.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Capacitor 8 : les plugins personnalisés doivent être
        // enregistrés AVANT super.onCreate (qui construit le Bridge).
        // L'ordre inverse explique « plugin is not implemented ».
        registerPlugin(AmsNativePlugin::class.java)
        registerPlugin(AmsPlayerPlugin::class.java)
        super.onCreate(savedInstanceState)
        capturePendingRoute(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        capturePendingRoute(intent)
    }

    private fun capturePendingRoute(intent: Intent) {
        val route = intent.getStringExtra(AmsNativePlugin.KEY_PENDING_ROUTE)
        if (route.isNullOrBlank()) return
        val trackRef = intent.getStringExtra(AmsNativePlugin.KEY_PENDING_TRACK_REF) ?: ""
        getSharedPreferences(AmsNativePlugin.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(AmsNativePlugin.KEY_PENDING_ROUTE, route)
            .putString(AmsNativePlugin.KEY_PENDING_TRACK_REF, trackRef)
            .apply()
    }
}
