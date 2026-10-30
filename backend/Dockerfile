# Build context is the repo root (see docker-compose.yml) so the image can also serve ../frontend.
FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
# For maintenance inside the container, e.g. `docker compose exec api npm run auth:reset-password`
COPY backend/scripts ./scripts
COPY frontend /app/frontend

USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:4000/health || exit 1
# Apply pending migrations, seed an empty database, then start
CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js && node src/server.js"]
