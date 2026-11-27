import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const connectionString = process.env.NEON_DATABASE_URL

if (!connectionString) {
  throw new Error("NEON_DATABASE_URL is not configured")
}

type NeonGlobal = typeof globalThis & { neonPool?: Pool }
const globalForNeon = globalThis as NeonGlobal

export const pool = globalForNeon.neonPool ?? new Pool({ connectionString, max: 5 })

if (process.env.NODE_ENV !== "production") {
  globalForNeon.neonPool = pool
}

export const db = drizzle(pool, { schema })
