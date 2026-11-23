import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import authRoutes from './routes/auth.routes';
import budgetRoutes from './routes/budget.routes';
import dashboardRoutes from './routes/dashboard.routes';
import expenseRoutes from './routes/expense.routes';
import healthRoutes from './routes/health.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import storageRoutes from './routes/storage.routes';
import supplierRoutes from './routes/supplier.routes';
import userRoutes from './routes/user.routes';
import { measureRequests } from './middlewares/performance.middleware';
import { allowedWebOrigin, privateResponses, safeRequestError } from './middlewares/security.middleware';

/** API y, si WEB_DIR apunta a la web exportada, también la página: un solo origen (boletas.clepit.cl). */
export function createApp(webDir = process.env.WEB_DIR) {
  const app = express();
  app.disable('x-powered-by');
  // Solo se confía en X-Forwarded-For cuando viene del proxy indicado (red interna de Docker).
  if (process.env.TRUSTED_PROXIES) app.set('trust proxy', process.env.TRUSTED_PROXIES.split(',').map(value => value.trim()));
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        // La lectura de boletas en la web usa WebAssembly y un worker servidos desde este mismo sitio.
        'script-src': ["'self'", "'wasm-unsafe-eval'", ...inlineScriptHashes(webDir)],
        'worker-src': ["'self'", 'blob:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'", 'data:', 'blob:'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'font-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    // El acceso con Google abre una ventana que pasa por otro sitio y debe poder avisar a la que la abrió.
    crossOriginOpenerPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  }));

  const api = express.Router();
  api.use(measureRequests, privateResponses, allowedWebOrigin, cors({ origin: true }), express.json({ limit: '32kb' }));
  api.use('/health', healthRoutes);
  api.use('/auth', authRoutes);
  api.use('/expenses', expenseRoutes);
  api.use('/suppliers', supplierRoutes);
  api.use('/budgets', budgetRoutes);
  api.use('/storage', storageRoutes);
  api.use('/users', userRoutes);
  api.use('/dashboard', dashboardRoutes);
  api.use('/notifications', notificationRoutes);
  api.use('/reports', reportRoutes);
  api.use((_req, res) => { res.status(404).json({ message: 'La ruta solicitada no existe.' }); });
  app.use('/api', api);

  if (webDir && fs.existsSync(path.join(webDir, 'index.html'))) serveWeb(app, path.resolve(webDir));
  app.use(safeRequestError);
  return app;
}

/** Expo deja un pequeño script en línea en cada página: se autoriza por su huella, sin abrir 'unsafe-inline'. */
function inlineScriptHashes(webDir?: string): string[] {
  if (!webDir || !fs.existsSync(webDir)) return [];
  const hashes = new Set<string>();
  for (const name of fs.readdirSync(webDir, { recursive: true }).map(String).filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(webDir, name), 'utf8');
    for (const match of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      if (match[1]) hashes.add(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
    }
  }
  return [...hashes];
}

/** Cada pantalla exportada es un .html; las rutas con parámetros usan el archivo [id].html. */
function serveWeb(app: express.Express, root: string) {
  app.use(express.static(root, {
    extensions: ['html'], index: 'index.html', dotfiles: 'ignore',
    setHeaders: (res, file) => {
      const hashed = /[\\/](_expo|assets)[\\/]/.test(file);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : /[\\/]ocr[\\/]/.test(file) ? 'public, max-age=604800' : 'no-cache');
    },
  }));
  app.get(/.*/, (req, res, next) => {
    if (path.extname(req.path)) { next(); return; }
    const parent = path.posix.dirname(req.path);
    const dynamic = path.join(root, parent, '[id].html');
    const target = dynamic.startsWith(root) && /^\/[\w/-]*$/.test(req.path) && fs.existsSync(dynamic) ? dynamic : path.join(root, 'index.html');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(target, { dotfiles: 'allow' });
  });
}
