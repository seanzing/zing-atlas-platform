# Build v6 - 2026-05-05 - Pass NEXT_PUBLIC_ vars as build args for Railway
FROM node:24-alpine

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY platform/package.json platform/package-lock.json* ./
RUN npm ci

COPY platform/ .

RUN npx prisma generate

# Build args for NEXT_PUBLIC_ vars (must be available at build time for Next.js)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
