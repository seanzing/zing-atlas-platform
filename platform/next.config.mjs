import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly expose these at build time for Railway Docker builds.
  // NEXT_PUBLIC_ vars must be available during `npm run build` to be
  // embedded in the client bundle. Railway injects env vars at runtime
  // by default, so we use publicRuntimeConfig as a runtime fallback.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};

export default withSentryConfig(nextConfig, {
  org: "zing-local",
  project: "atlas-platform",
  silent: true,
  disableLogger: true,
});
