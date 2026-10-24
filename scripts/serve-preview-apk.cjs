// Serves only the generated preview APK, never a directory or project sources.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const apkDirectory = path.resolve(process.env.CLEPIT_APK_DIR || path.join(__dirname, '../artifacts'));
const apk = path.join(apkDirectory, 'climatizacion-rg-preview.apk');
const downloads = new Map([
  ['/climatizacion-rg-preview.apk', apk],
  ['/climatizacion-rg-1.0.4.apk', path.join(apkDirectory, 'climatizacion-rg-1.0.4.apk')],
  ['/climatizacion-rg-1.0.5.apk', path.join(apkDirectory, 'climatizacion-rg-1.0.5.apk')],
  ['/climatizacion-rg-1.0.6.apk', path.join(apkDirectory, 'climatizacion-rg-1.0.6.apk')],
  ['/climatizacion-rg-1.0.7.apk', path.join(apkDirectory, 'climatizacion-rg-1.0.7.apk')],
  ['/climatizacion-rg-1.0.8.apk', path.join(apkDirectory, 'climatizacion-rg-1.0.8.apk')],
  ['/clipit-1.0.9.apk', path.join(apkDirectory, 'clipit-1.0.9.apk')],
  ['/clepit-1.0.10.apk', path.join(apkDirectory, 'clepit-1.0.10.apk')],
  ['/clepit-pruebas-ocr-0.1.0.apk', path.join(apkDirectory, 'clepit-pruebas-ocr-0.1.0.apk')],
  ['/clepit-pruebas-ocr-0.1.1.apk', path.join(apkDirectory, 'clepit-pruebas-ocr-0.1.1.apk')],
  ['/clepit-pruebas-ocr-0.1.2.apk', path.join(apkDirectory, 'clepit-pruebas-ocr-0.1.2.apk')],
  ['/clepit-pruebas-ocr-0.1.3.apk', path.join(apkDirectory, 'clepit-pruebas-ocr-0.1.3.apk')],
  ['/clepit-pruebas-ocr-0.1.4.apk', path.join(apkDirectory, 'clepit-pruebas-ocr-0.1.4.apk')],
  ['/clepit-pruebas-ocr-0.1.5.apk', path.join(apkDirectory, 'clepit-pruebas-ocr-0.1.5.apk')],
  ['/clepit-1.1.0.apk', path.join(apkDirectory, 'clepit-1.1.0.apk')],
  ['/clepit-1.1.1.apk', path.join(apkDirectory, 'clepit-1.1.1.apk')],
  ['/clepit-1.1.2.apk', path.join(apkDirectory, 'clepit-1.1.2.apk')],
  ['/clepit.apk', path.join(apkDirectory, 'clepit-1.1.0.apk')],
]);
if (!fs.existsSync(apk)) throw new Error('Primero genera artifacts/climatizacion-rg-preview.apk.');
http.createServer((req, res) => {
  const selected=downloads.get(req.url);
  if (!['GET', 'HEAD'].includes(req.method) || !selected || !fs.existsSync(selected)) {
    res.writeHead(404); res.end(); return;
  }
  const size = fs.statSync(selected).size;
  res.writeHead(200, {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': `attachment; filename="${path.basename(selected)}"`,
    'Content-Length': size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(selected);
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}).listen(8079, '127.0.0.1', () => console.log('Descarga local: http://127.0.0.1:8079/climatizacion-rg-preview.apk'));
