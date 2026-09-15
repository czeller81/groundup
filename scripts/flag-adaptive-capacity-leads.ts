import { and, eq, ne } from "drizzle-orm";
import { db, pool } from "../server/db";
import { trialLeads } from "../shared/schema";

async function main() {
  const rows = await db.select({ id: trialLeads.id, status: trialLeads.status })
    .from(trialLeads)
    .where(and(
      eq(trialLeads.program, "adaptive-capacity"),
      ne(trialLeads.status, "archived"),
    ));

  let updated = 0;
  await db.transaction(async (tx) => {
    for (const lead of rows) {
      if (lead.status === "suspicious") continue;
      await tx.update(trialLeads)
        .set({ status: "suspicious" })
        .where(and(eq(trialLeads.id, lead.id), ne(trialLeads.status, "archived")));
      updated++;
    }
  });

  console.log(JSON.stringify({ program: "adaptive-capacity", scanned: rows.length, updated }));
}

main().finally(() => pool.end());