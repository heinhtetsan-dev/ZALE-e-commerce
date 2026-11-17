import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

// The pg adapter serialises Date parameters without an offset and parses
// results as UTC, so the session time zone must be UTC regardless of the
// database server's default.
export const pgSessionOptions = "-c TimeZone=UTC";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, options: pgSessionOptions }),
});

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
