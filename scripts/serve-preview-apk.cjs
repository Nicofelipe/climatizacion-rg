// Serves only the generated preview APK, never a directory or project sources.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const apk = path.resolve(__dirname, '../artifacts/climatizacion-rg-preview.apk');
const downloads = new Map([
  ['/climatizacion-rg-preview.apk', apk],
  ['/climatizacion-rg-1.0.4.apk', path.resolve(__dirname, '../artifacts/climatizacion-rg-1.0.4.apk')],
  ['/climatizacion-rg-1.0.5.apk', path.resolve(__dirname, '../artifacts/climatizacion-rg-1.0.5.apk')],
  ['/climatizacion-rg-1.0.6.apk', path.resolve(__dirname, '../artifacts/climatizacion-rg-1.0.6.apk')],
  ['/climatizacion-rg-1.0.7.apk', path.resolve(__dirname, '../artifacts/climatizacion-rg-1.0.7.apk')],
  ['/climatizacion-rg-1.0.8.apk', path.resolve(__dirname, '../artifacts/climatizacion-rg-1.0.8.apk')],
  ['/clipit-1.0.9.apk', path.resolve(__dirname, '../artifacts/clipit-1.0.9.apk')],
  ['/clepit-1.0.10.apk', path.resolve(__dirname, '../artifacts/clepit-1.0.10.apk')],
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
