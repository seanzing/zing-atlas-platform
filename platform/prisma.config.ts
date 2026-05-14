import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // DIRECT_URL bypasses pgbouncer for DDL migrations (required for Supabase).
    // Empty string fallback lets prisma generate pass at build time without a DB connection.
    // At start time (prisma migrate deploy), both vars are available from Railway env.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
