package com.pdfreader

import android.content.Intent
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class IncomingPdfPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    val module = IncomingPdfModule(reactContext)
    reactContext.addActivityEventListener(object : com.facebook.react.bridge.ActivityEventListener {
      override fun onActivityResult(
        activity: android.app.Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {}

      override fun onNewIntent(intent: Intent) {
        module.onNewIntent(intent)
      }
    })
    return listOf(module)
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
