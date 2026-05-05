import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dns from "dns";

// Force Node.js to prefer IPv4 when resolving hostnames.
// Railway cannot reach Supabase's Postgres host via IPv6 (only AAAA record exists).
// This ensures pg connects via IPv4 even when the host has both A and AAAA records,
// and prevents ENETUNREACH errors when only IPv4 is reachable.
dns.setDefaultResultOrder("ipv4first");

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
  });
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
