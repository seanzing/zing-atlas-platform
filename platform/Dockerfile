# Build v5 - 2026-04-03
FROM node:24-alpine

RUN apk add --no-cache libc6-compat openssl ca-certificates && update-ca-certificates

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
