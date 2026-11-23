# Clepit Gestión de Boletas: web y API en un solo contenedor (boletas.clepit.cl).
# 1) Exporta la web (Expo) · 2) Compila la API · 3) Imagen final sin herramientas de compilación ni datos privados.

FROM node:24-bookworm-slim AS web
WORKDIR /src/mobile
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/ ./
RUN npm run build:web

FROM node:24-bookworm-slim AS api
# msnodesqlv8 (solo para Windows) se compila igual al instalar; necesita estas herramientas aquí, no en la imagen final.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ unixodbc-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /src/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# En Linux la app usa mssql (JavaScript puro): no necesita controladores ODBC.
FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 TZ=America/Santiago \
    WEB_DIR=/app/web MIGRATIONS_DIR=/app/database/migrations RECEIPT_STORAGE_DIR=/app/data/receipts
WORKDIR /app/backend
COPY --from=api /src/backend/node_modules ./node_modules
COPY --from=api /src/backend/dist ./dist
COPY --from=api /src/backend/assets ./assets
COPY --from=api /src/backend/package.json ./
COPY database /app/database
COPY --from=web /src/mobile/dist /app/web
RUN mkdir -p /app/data/receipts /app/backend/uploads && chown -R node:node /app/data /app/backend/uploads
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/server.js"]
