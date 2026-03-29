import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "zing-local",
  project: "atlas-platform",
  silent: true,
  disableLogger: true,
});
