// Exporta la web en dist. Por omisión la API está en el mismo sitio (/api), como en boletas.clepit.cl.
const { spawnSync } = require('node:child_process');
const env = { ...process.env, EXPO_PUBLIC_API_URL: process.env.WEB_API_URL || '/api', NODE_ENV: 'production' };
for (const args of [['./scripts/copy-ocr.cjs'], [require.resolve('expo/bin/cli'), 'export', '--platform', 'web']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
