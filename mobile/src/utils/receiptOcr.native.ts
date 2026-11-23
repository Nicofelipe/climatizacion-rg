import { requireOptionalNativeModule } from 'expo-modules-core';
import { File } from 'expo-file-system';

export { parseReceiptText } from './receiptOcrParser';
export interface RecognizedReceipt { text: string; timbre: string | null }

/** Lectura en el teléfono: texto de la boleta y timbre del SII. La foto no sale del equipo en este paso. */
export async function recognizeReceipt(uri: string): Promise<RecognizedReceipt> {
  const file = new File(uri);
  if (!file.exists || !file.size) throw new Error('No se puede leer esta imagen.');
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen supera los 10 MB.');
  const module = requireOptionalNativeModule<{ recognize: (uri: string) => Promise<{ text: string; timbre?: string | null }> }>('ClepitReceiptOcr');
  if (!module) throw new Error('Para escanear, actualiza la aplicación Clepit.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('La lectura tardó demasiado. Intenta con una foto más nítida.')), 40000);
  });
  const result = await Promise.race([module.recognize(uri), timeout]).finally(() => clearTimeout(timer));
  return { text: result.text, timbre: result.timbre ?? null };
}
