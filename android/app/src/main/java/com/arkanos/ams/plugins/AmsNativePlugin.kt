package com.arkanos.ams.plugins

import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Plugin Capacitor personnalisé d'A.MS.
 *
 * Étape 1 : seules les méthodes d'identité sont réelles.
 * Les méthodes métier (scan, notifications, planification)
 * répondent honnêtement « non implémenté » — elles ne renvoient
 * jamais de fausses données.
 */
@CapacitorPlugin(name = "AmsNative")
class AmsNativePlugin : Plugin() {

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

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun notify(call: PluginCall) {
        call.reject(
            "NOTIFICATIONS_NOT_IMPLEMENTED : les notifications locales arrivent à l'étape 3."
        )
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun scanLibrary(call: PluginCall) {
        call.reject(
            "SCAN_NOT_IMPLEMENTED : le scan MediaStore sera branché à l'étape 2."
        )
    }

    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    fun schedulePeriodicSync(call: PluginCall) {
        call.reject(
            "BACKGROUND_NOT_IMPLEMENTED : WorkManager sera branché à l'étape 3."
        )
    }
}
