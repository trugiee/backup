FROM node:22-alpine AS builder
WORKDIR /app

# multer-storage-cloudinary still declares a cloudinary v1 peer dependency while
# the app uses v2, so npm stops with ERESOLVE. Apply the override to every npm
# command in this stage (ci and prune both re-resolve the tree).
ENV npm_config_legacy_peer_deps=true

COPY package*.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/uploads

# OTA bundles published by scripts/ota.mjs
COPY updates/ ./updates/

EXPOSE 3001

CMD ["node", "dist/src/index.js"]
