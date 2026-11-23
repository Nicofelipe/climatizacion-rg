import 'dotenv/config';

import { createApp } from './app';
import { startPushWorker } from './services/pushDelivery.service';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

if ((process.env.JWT_SECRET ?? '').length < 32) {
  console.error('JWT_SECRET debe tener al menos 32 caracteres.');
  process.exit(1);
}

const server = createApp().listen(PORT, HOST, () => console.log(`API running on port ${PORT}`));
server.requestTimeout = 120000;
server.headersTimeout = 20000;
startPushWorker();

// Docker detiene el contenedor con SIGTERM: se dejan terminar las solicitudes en curso.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 20000).unref();
  });
}
