import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "@shared/schema";

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const useLocalPostgres =
  process.env.GROUNDUP_LOCAL_POSTGRES === "true" &&
  process.env.NODE_ENV !== "production";

let selectedPool: any;
let selectedDb: any;

if (useLocalPostgres) {
  selectedPool = new PgPool({ connectionString: databaseUrl });
  selectedDb = drizzlePg(selectedPool, { schema });
} else {
  neonConfig.webSocketConstructor = ws;
  selectedPool = new NeonPool({ connectionString: databaseUrl });
  selectedDb = drizzleNeon({ client: selectedPool, schema });
}

// Production remains on the Neon driver. The node-postgres path exists only
// for explicit non-production/CI execution against disposable PostgreSQL.
export const pool = selectedPool;
export const db = selectedDb;
