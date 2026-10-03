# ---- Stage 1: build the React UI
FROM node:22-slim AS ui
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend deps + Prisma client
FROM node:22-slim AS api
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/src ./src

# ---- Stage 3: runtime
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=4000 DATABASE_URL=file:/data/app.db
WORKDIR /app
COPY --from=api /app/backend ./backend
COPY --from=ui /app/frontend/dist ./frontend/dist
RUN mkdir -p /data && chown -R node:node /data /app
USER node
WORKDIR /app/backend
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 CMD curl -fs http://localhost:4000/health || exit 1
# Create/upgrade schema, seed on first run, then start
CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.js && node src/server.js"]
