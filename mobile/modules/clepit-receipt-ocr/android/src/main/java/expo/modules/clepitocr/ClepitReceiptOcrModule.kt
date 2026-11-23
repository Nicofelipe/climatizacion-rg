package expo.modules.clepitocr

import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.abs

/** Lee la boleta en el teléfono: el texto y el timbre electrónico del SII (código PDF417). No usa internet. */
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
        val scanner = BarcodeScanning.getClient(
          BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_PDF417).build()
        )
        val text = reader.process(image)
        val codes = scanner.process(image)
        // Basta que una de las dos lecturas funcione: la otra queda vacía.
        Tasks.whenAllComplete(text, codes).addOnCompleteListener {
          reader.close()
          scanner.close()
          if (!text.isSuccessful && !codes.isSuccessful) {
            promise.reject("OCR_FAILED", "No fue posible leer esta foto. Puedes corregir los datos manualmente.", text.exception)
          } else {
            promise.resolve(mapOf(
              "text" to if (text.isSuccessful) rows(text.result) else "",
              "timbre" to if (codes.isSuccessful) timbre(codes.result) else null
            ))
          }
        }
      } catch (error: Exception) {
        promise.reject("OCR_IMAGE_INVALID", "No fue posible abrir la imagen seleccionada.", error)
      }
    }
  }

  /** El timbre viene en ISO-8859-1; rawValue puede ser nulo cuando trae tildes. */
  private fun timbre(codes: List<Barcode>): String? =
    codes.mapNotNull { code -> code.rawBytes?.toString(Charsets.ISO_8859_1) ?: code.rawValue }.firstOrNull { it.contains("<TED") }

  /** Recorre por renglones: la etiqueta y el monto pueden venir en bloques distintos de la misma línea. */
  private fun rows(result: Text): String {
    val rows = mutableListOf<MutableList<Text.Line>>()
    result.textBlocks.flatMap { it.lines }.sortedBy { it.boundingBox?.centerY() ?: 0 }.forEach { line ->
      val box = line.boundingBox
      val row = rows.lastOrNull()
      val anchor = row?.firstOrNull()?.boundingBox
      if (row != null && box != null && anchor != null && abs(box.centerY() - anchor.centerY()) <= minOf(box.height(), anchor.height()) * 0.45) row.add(line)
      else rows.add(mutableListOf(line))
    }
    return rows.joinToString("\n") { row -> row.sortedBy { it.boundingBox?.left ?: 0 }.joinToString(" ") { it.text } }
  }
}
