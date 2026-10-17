package com.arkanos.ams

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.arkanos.ams.plugins.AmsNativePlugin

/**
 * Point d'entrée natif d'A.MS.
 * Enregistre le plugin Capacitor personnalisé AmsNative.
 */
class MainActivity : BridgeActivity() {

    override fun(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(AmsNativePlugin::class.java)
    }
}
