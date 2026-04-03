# Build v5 - 2026-04-03 - Root Dockerfile pointing to platform/
FROM node:24-alpine

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY platform/package.json platform/package-lock.json* ./
RUN npm ci

COPY platform/ .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
