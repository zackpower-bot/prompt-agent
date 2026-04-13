FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

ENV DATABASE_URL=file:/app/build.db
ENV ADMIN_PASSWORD=build-admin-password
ENV MEMBER_PASSWORD=build-member-password
ENV MINIMAX_API_KEY=build-minimax-key
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY . .
RUN npx prisma generate
RUN npm run build

FROM deps AS schema

ENV NEXT_TELEMETRY_DISABLED=1

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN mkdir -p /app/data /app/src/generated/prisma \
  && chown -R node:node /app/data /app/src/generated/prisma

USER node

CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN mkdir -p /app/data && chown -R node:node /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/messages ./messages

USER node

EXPOSE 3000

CMD ["node", "server.js"]
