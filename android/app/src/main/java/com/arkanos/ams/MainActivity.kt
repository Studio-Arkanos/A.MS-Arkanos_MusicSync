package com.arkanos.ams

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.arkanos.ams.plugins.AmsNativePlugin

/**
 * Point d'entrée natif d'A.MS.
 * - enregistre le plugin Capacitor personnalisé AmsNative ;
 * - capture la route en attente (clic sur une notification)
 *   pour que l'interface ouvre l'écran du morceau concerné.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(AmsNativePlugin::class.java)
        capturePendingRoute(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { capturePendingRoute(it) }
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
