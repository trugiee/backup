FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
# multer-storage-cloudinary still declares a cloudinary v1 peer dependency while
# the app uses v2, so a plain `npm ci` stops with ERESOLVE.
RUN npm ci --legacy-peer-deps

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

RUN npm prune --production

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
