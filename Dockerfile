# Clepit Gestión de Boletas: web y API en un solo contenedor (boletas.clepit.cl).
# 1) Exporta la web (Expo) · 2) Compila la API · 3) Imagen final sin herramientas de compilación ni datos privados.

FROM node:24-bookworm-slim AS web
WORKDIR /src/mobile
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/ ./
RUN npm run build:web

FROM node:24-bookworm-slim AS api
# msnodesqlv8 se compila contra unixODBC cuando no hay binario para esta versión de Node.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ unixodbc-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /src/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg unixodbc \
 && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
 && apt-get update && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
 && apt-get purge -y gnupg && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
 # Reutiliza conexiones: cada consulta abre la suya y el saludo TLS es caro.
 && sed -i '/^\[ODBC\]/d;/^Pooling/d' /etc/odbcinst.ini && printf '[ODBC]\nPooling=Yes\n' >> /etc/odbcinst.ini && sed -i '/^\[ODBC Driver 18 for SQL Server\]/a CPTimeout=120' /etc/odbcinst.ini
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
