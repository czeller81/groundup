import { and, eq, ilike, or } from "drizzle-orm";
import { db, pool } from "../server/db";
import { trialLeads } from "../shared/schema";

const suspiciousNames: Array<[string, string]> = [
  ["vyyn", "mrobp"],
  ["denwfk", "lnnvxa"],
  ["wfstvs", "dpsgrld"],
  ["ydpoccol", "icjheen"],
  ["joagv", "lnozziq"],
  ["qiwoh", "guppz"],
];

const smsGatewayDomains = ["txt.att.net", "vtext.com", "tmomail.net", "messaging.sprintpcs.com", "vmobl.com"];

async function main() {
  const rows = await db.select().from(trialLeads).where(or(
    ...suspiciousNames.map(([firstName, lastName]) => and(eq(trialLeads.firstName, firstName), eq(trialLeads.lastName, lastName))),
    ...smsGatewayDomains.map((domain) => ilike(trialLeads.email, `%@${domain}`)),
  ));
  let updated = 0;
  for (const lead of rows) {
    if (lead.status === "suspicious") continue;
    await db.update(trialLeads).set({ status: "suspicious" }).where(and(eq(trialLeads.id, lead.id), eq(trialLeads.status, lead.status)));
    updated++;
  }
  console.log(JSON.stringify({ scanned: rows.length, updated }));
}

main().finally(() => pool.end());