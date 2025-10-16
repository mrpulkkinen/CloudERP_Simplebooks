FROM node:20-slim AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json apps/api/tsconfig.build.json
COPY apps/api/vitest.config.ts apps/api/vitest.config.ts
COPY apps/web/package.json apps/web/package.json
COPY prisma ./prisma

RUN npm install

COPY apps/api ./apps/api

RUN npx prisma generate
RUN npm run --workspace apps/api build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 5010
CMD ["node", "apps/api/dist/index.js"]
