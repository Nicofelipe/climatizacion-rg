// Serves only the generated preview APK, never a directory or project sources.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const apk = path.resolve(__dirname, '../artifacts/climatizacion-rg-preview.apk');
if (!fs.existsSync(apk)) throw new Error('Primero genera artifacts/climatizacion-rg-preview.apk.');
http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method) || req.url !== '/climatizacion-rg-preview.apk') {
    res.writeHead(404); res.end(); return;
  }
  const size = fs.statSync(apk).size;
  res.writeHead(200, {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': 'attachment; filename="climatizacion-rg-preview.apk"',
    'Content-Length': size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(apk);
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}).listen(8079, '127.0.0.1', () => console.log('Descarga local: http://127.0.0.1:8079/climatizacion-rg-preview.apk'));
