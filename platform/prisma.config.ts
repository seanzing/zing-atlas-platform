import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    adapter: async () => {
      // Use DIRECT_URL for migrations to bypass pgbouncer (required for DDL statements).
      // Falls back to DATABASE_URL if DIRECT_URL is not set.
      return new PrismaPg(
        new Pool({
          connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        })
      );
    },
  },
});
