package expo.modules.clepitocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ClepitReceiptOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClepitReceiptOcr")
    AsyncFunction("recognize") { source: String, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw IllegalStateException("Context unavailable")
        val uri = Uri.parse(source)
        require(uri.scheme == "file" || uri.scheme == "content")
        val image = InputImage.fromFilePath(context, uri)
        val reader = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        reader.process(image)
          .addOnSuccessListener { result -> promise.resolve(mapOf("text" to result.text)) }
          .addOnFailureListener { error -> promise.reject("OCR_FAILED", "No fue posible leer esta foto. Puedes corregir los datos manualmente.", error) }
          .addOnCompleteListener { reader.close() }
      } catch (error: Exception) {
        promise.reject("OCR_IMAGE_INVALID", "No fue posible abrir la imagen seleccionada.", error)
      }
    }
  }
}
