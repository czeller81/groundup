import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const useLocalPostgres =
  process.env.GROUNDUP_LOCAL_POSTGRES === "true" &&
  process.env.NODE_ENV !== "production";

type GroundUpDb = ReturnType<typeof drizzleNeon>;

let selectedPool: NeonPool;
let selectedDb: GroundUpDb;

if (useLocalPostgres) {
  // CI/test-only transport. Preserve the application's existing typed Drizzle
  // surface while swapping only the underlying PostgreSQL connection driver.
  const localPool = new PgPool({ connectionString: databaseUrl });
  const localDb = drizzlePg(localPool, { schema });
  selectedPool = localPool as unknown as NeonPool;
  selectedDb = localDb as unknown as GroundUpDb;
} else {
  const neonPool = new NeonPool({ connectionString: databaseUrl });
  selectedPool = neonPool;
  selectedDb = drizzleNeon({ client: neonPool, schema });
}

export const pool = selectedPool;
export const db = selectedDb;
