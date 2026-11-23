// Copia a public/ocr los archivos del lector web. Se sirven desde el mismo sitio: la foto nunca sale a otro servicio.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), target = path.join(root, 'public', 'ocr'), modules = path.join(root, 'node_modules');
const files = [
  ['tesseract.js/dist/tesseract.min.js', 'tesseract.min.js'],
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz', 'spa.traineddata.gz'],
  ['zxing-wasm/dist/iife/reader/index.js', 'zxing-reader.js'],
  ['zxing-wasm/dist/reader/zxing_reader.wasm', 'zxing_reader.wasm'],
];
fs.mkdirSync(target, { recursive: true });
for (const [source, name] of files) fs.copyFileSync(path.join(modules, source), path.join(target, name));
console.log(`Lector web listo: ${files.length} archivos en public/ocr.`);
