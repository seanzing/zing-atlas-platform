export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN || "",
      tracesSampleRate: 1.0,
      debug: false,
      enabled: !!process.env.SENTRY_DSN,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN || "",
      tracesSampleRate: 1.0,
      debug: false,
      enabled: !!process.env.SENTRY_DSN,
    });
  }
}
