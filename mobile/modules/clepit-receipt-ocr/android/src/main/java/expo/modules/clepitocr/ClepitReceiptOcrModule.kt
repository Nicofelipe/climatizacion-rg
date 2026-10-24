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
          .addOnSuccessListener { result ->
            // Read across columns before moving down: labels and amounts may be separate blocks.
            val rows = mutableListOf<MutableList<com.google.mlkit.vision.text.Text.Line>>()
            result.textBlocks.flatMap { it.lines }.sortedBy { it.boundingBox?.centerY() ?: 0 }.forEach { line ->
              val box = line.boundingBox
              val row = rows.lastOrNull()
              val anchor = row?.firstOrNull()?.boundingBox
              if (row != null && box != null && anchor != null && kotlin.math.abs(box.centerY() - anchor.centerY()) <= minOf(box.height(), anchor.height()) * 0.45) row.add(line)
              else rows.add(mutableListOf(line))
            }
            val text = rows.joinToString("\n") { row -> row.sortedBy { it.boundingBox?.left ?: 0 }.joinToString(" ") { it.text } }
            promise.resolve(mapOf("text" to text))
          }
          .addOnFailureListener { error -> promise.reject("OCR_FAILED", "No fue posible leer esta foto. Puedes corregir los datos manualmente.", error) }
          .addOnCompleteListener { reader.close() }
      } catch (error: Exception) {
        promise.reject("OCR_IMAGE_INVALID", "No fue posible abrir la imagen seleccionada.", error)
      }
    }
  }
}
