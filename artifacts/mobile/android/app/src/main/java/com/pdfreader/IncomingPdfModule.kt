package com.pdfreader

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream

class IncomingPdfModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun take(promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
      val payload = readIntent(activity?.intent)
      if (payload != null) consume(activity?.intent)
      promise.resolve(payload)
    } catch (error: Exception) {
      promise.reject("INCOMING_PDF", error.message, error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Double) {}

  fun onNewIntent(intent: Intent) {
    val payload = try {
      readIntent(intent)
    } catch (_: Exception) {
      null
    } ?: return
    consume(intent)
    if (!reactContext.hasActiveReactInstance()) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT, payload)
  }

  private fun readIntent(intent: Intent?): WritableMap? {
    if (intent == null) return null
    val uri = when (intent.action) {
      Intent.ACTION_VIEW -> intent.data
      Intent.ACTION_SEND -> streamUri(intent)
      else -> null
    } ?: return null

    val mime = intent.type ?: reactContext.contentResolver.getType(uri)
    var name = displayName(uri) ?: uri.lastPathSegment ?: "document.pdf"
    name = android.net.Uri.decode(name).substringAfterLast('/')
    if (!name.endsWith(".pdf", ignoreCase = true)) name = "$name.pdf"
    val looksLikePdf = mime?.contains("pdf", ignoreCase = true) == true ||
      name.endsWith(".pdf", ignoreCase = true)
    if (!looksLikePdf) return null

    val dir = File(reactContext.filesDir, "pdfs")
    if (!dir.exists()) dir.mkdirs()
    val safe = name.replace(Regex("[^\\w.\\- ]+"), "_")
    val dest = File(dir, "${System.currentTimeMillis()}_$safe")
    reactContext.contentResolver.openInputStream(uri).use { input ->
      if (input == null) error("Could not read the selected PDF")
      FileOutputStream(dest).use { output -> input.copyTo(output) }
    }

    return Arguments.createMap().apply {
      putString("path", dest.absolutePath)
      putString("name", name)
      putString("sourceUri", uri.toString())
      putDouble("size", dest.length().toDouble())
    }
  }

  private fun streamUri(intent: Intent): Uri? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    }
  }

  private fun displayName(uri: Uri): String? {
    if (uri.scheme == "file") return uri.lastPathSegment
    reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
      ?.use { cursor ->
        if (!cursor.moveToFirst()) return null
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index < 0) return null
        return cursor.getString(index)
      }
    return null
  }

  private fun consume(intent: Intent?) {
    intent ?: return
    intent.action = Intent.ACTION_MAIN
    intent.data = null
    intent.type = null
    intent.removeExtra(Intent.EXTRA_STREAM)
  }

  companion object {
    const val NAME = "IncomingPdf"
    const val EVENT = "IncomingPdf"
  }
}
