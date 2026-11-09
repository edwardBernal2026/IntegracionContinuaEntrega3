# Contenedor 1: API de notas (Node.js + Express)
# Imagen base oficial con versión fija (no "latest")
FROM node:20.18.1-alpine3.20

WORKDIR /usr/src/app

# Instalar solo dependencias de producción (aprovecha la caché de capas)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copiar el código fuente
COPY src ./src

ENV NODE_ENV=production \
    APP_PORT=3000

# Ejecutar como usuario sin privilegios
USER node

EXPOSE 3000

# Autochequeo: el contenedor consulta su propia API (no es comunicación con db)
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/index.js"]
