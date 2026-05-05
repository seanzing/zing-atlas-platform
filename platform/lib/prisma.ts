import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
// CA cert import available for future SSL pinning
// import { SUPABASE_CA_CERT } from "./supabase-ca";

function createPrismaClient() {
  const poolConfig: PoolConfig & { family?: number } = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    // Force IPv4 — Railway outbound IPv6 cannot reach Supabase's direct Postgres host
    // which only resolves to an IPv6 address (2600:1f14::/32 range).
    family: 4,
  };
  const pool = new Pool(poolConfig as PoolConfig);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
