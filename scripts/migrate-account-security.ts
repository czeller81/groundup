import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";

async function main() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'unverified'`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_ip_hash text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_device_hash text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL REFERENCES users(id),
      token_hash text NOT NULL UNIQUE,
      expires_at timestamp NOT NULL,
      used_at timestamp,
      discovery_pass_claim_id varchar,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx ON email_verification_tokens(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS email_verification_tokens_expiry_idx ON email_verification_tokens(expires_at)`);
  console.log("Account security schema is ready.");
}

main().finally(() => pool.end());