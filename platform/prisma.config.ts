import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Note: do NOT call dotenv.config() here.
// During Railway builds, env vars are injected at runtime (start), not build time.
// prisma generate (build step) does not call fi() and does not need datasource.url.
// prisma migrate deploy (start step) runs with full env vars available.

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // DIRECT_URL bypasses pgbouncer for DDL statements (required for Supabase migrations).
    // Falls back to DATABASE_URL if DIRECT_URL is not set.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  migrate: {
    adapter: async () => {
      return new PrismaPg(
        new Pool({
          connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        })
      );
    },
  },
});
