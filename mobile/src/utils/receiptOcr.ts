import { parseReceiptText } from './receiptOcrParser';

export { parseReceiptText };
export interface RecognizedReceipt { text: string; timbre: string | null }

/*
 * Lectura en el navegador. Las librerías y el idioma se sirven desde este mismo sitio (/ocr, ver scripts/copy-ocr.cjs)
 * y se cargan solo al escanear: la foto no se envía a ningún servicio externo.
 */
interface TesseractWorker { recognize(image: HTMLCanvasElement): Promise<{ data: { text: string } }>; terminate(): Promise<unknown>; setParameters(values: Record<string, string>): Promise<unknown> }
interface OcrWindow extends Window {
  Tesseract?: { createWorker(language: string, mode: number, options: Record<string, unknown>): Promise<TesseractWorker> };
  ZXingWASM?: {
    prepareZXingModule(options: { overrides: Record<string, unknown>; fireImmediately?: boolean }): unknown;
    readBarcodes(image: ImageData, options: Record<string, unknown>): Promise<{ bytes: Uint8Array; text: string; isValid: boolean }[]>;
  };
}
const scripts = new Map<string, Promise<void>>();
function loadScript(source: string) {
  const known = scripts.get(source);
  if (known) return known;
  const loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.onload = () => resolve();
    script.onerror = () => { scripts.delete(source); reject(new Error('No se pudo cargar el lector. Revisa tu conexión y vuelve a intentarlo.')); };
    document.head.appendChild(script);
  });
  scripts.set(source, loading);
  return loading;
}

async function toCanvas(uri: string, longSide: number, blur = 0) {
  const blob = await (await fetch(uri)).blob();
  let bitmap: ImageBitmap;
  // Respeta la orientación con la que se tomó la foto.
  try { bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
  catch { throw new Error('El navegador no puede abrir este formato de foto. Usa JPG o PNG.'); }
  const scale = Math.min(3, longSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  // Suaviza el grano de las fotos con poca luz antes de leerlas.
  if (blur && 'filter' in context) context.filter = `blur(${blur}px)`;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (blur && 'filter' in context) context.filter = 'none';
  bitmap.close();
  return { canvas, context };
}

/** Grises con contraste ajustado al papel: mejora boletas térmicas pálidas o con sombra. */
function enhance(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const image = context.getImageData(0, 0, canvas.width, canvas.height), data = image.data;
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = gray;
    histogram[gray]++;
  }
  const total = data.length / 4;
  const percentile = (share: number) => { let sum = 0; for (let level = 0; level < 256; level++) { sum += histogram[level]; if (sum >= total * share) return level; } return 255; };
  const low = percentile(0.02), high = Math.max(low + 20, percentile(0.9));
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.max(0, Math.min(255, (data[i] - low) * 255 / (high - low)));
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  context.putImageData(image, 0, 0);
}

async function readTimbre(uri: string): Promise<string | null> {
  const target = window as OcrWindow;
  await loadScript('/ocr/zxing-reader.js');
  if (!target.ZXingWASM) return null;
  target.ZXingWASM.prepareZXingModule({ overrides: { locateFile: (file: string) => file.endsWith('.wasm') ? '/ocr/zxing_reader.wasm' : file } });
  for (const size of [2200, 3400]) {
    const { canvas, context } = await toCanvas(uri, size);
    const codes = await target.ZXingWASM.readBarcodes(context.getImageData(0, 0, canvas.width, canvas.height), { formats: ['PDF417'], tryHarder: true, tryRotate: true, tryInvert: false, tryDownscale: true, maxNumberOfSymbols: 4 });
    for (const code of codes) {
      const text = new TextDecoder('iso-8859-1').decode(code.bytes);
      if (text.includes('<TED')) return text;
    }
  }
  return null;
}

// Del preparado más fiel al más suavizado. Solo se prueba el siguiente si faltan datos principales.
const LIMIT_MS = 30000;
const attempts = [{ blur: 0, mode: '6' }, { blur: 1.6, mode: '6' }, { blur: 2.4, mode: '4' }];
const found = (text: string, timbre: string | null) => {
  const reading = parseReceiptText(text, timbre);
  return [reading.receiptNumber, reading.expenseDate, reading.totalAmount, reading.vatAmount || reading.vatSource, reading.supplierName, reading.supplierRut].filter(Boolean).length;
};

async function readText(uri: string, timbre: string | null): Promise<string> {
  const target = window as OcrWindow;
  await loadScript('/ocr/tesseract.min.js');
  if (!target.Tesseract) throw new Error('El lector no está disponible en este navegador.');
  const worker = await target.Tesseract.createWorker('spa', 1, {
    workerPath: '/ocr/worker.min.js', corePath: '/ocr', langPath: '/ocr', workerBlobURL: false, gzip: true, cacheMethod: 'none',
  });
  try {
    const started = Date.now();
    let best = { text: '', score: -1 };
    for (const attempt of attempts) {
      const { canvas, context } = await toCanvas(uri, 2400, attempt.blur);
      enhance(canvas, context);
      // Espacios conservados: la etiqueta y su monto quedan en el mismo renglón.
      await worker.setParameters({ tessedit_pageseg_mode: attempt.mode, preserve_interword_spaces: '1' });
      const left = LIMIT_MS - (Date.now() - started);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), Math.max(1, left)); });
      const result = await Promise.race([worker.recognize(canvas), timeout]).finally(() => clearTimeout(timer));
      if (!result) {
        if (best.score > 0) break;
        throw new Error('La lectura tardó demasiado. Intenta con una foto más nítida y con mejor luz.');
      }
      const { text } = result.data;
      const score = found(text, timbre);
      if (score > best.score) best = { text, score };
      // El timbre ya trae lo esencial: con una lectura del nombre basta.
      if (best.score >= 5 || timbre || Date.now() - started > LIMIT_MS / 2) break;
    }
    return best.text;
  } finally { await worker.terminate(); }
}

export async function recognizeReceipt(uri: string): Promise<RecognizedReceipt> {
  const timbre = await readTimbre(uri).catch(() => null);
  try { return { text: await readText(uri, timbre), timbre }; }
  catch (error) {
    // Con el timbre ya están los datos principales: no hace falta el texto.
    if (timbre) return { text: '', timbre };
    throw error;
  }
}
