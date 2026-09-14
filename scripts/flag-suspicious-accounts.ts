import { and, eq, ilike, sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import { memberAuditEvents, users } from "../shared/schema";

const suspiciousNames = new Set([
  "vyyn mrobp",
  "denwfk lnnvxa",
  "wfstvs dpsgrld",
  "ydpoccol icjheen",
  "joagv lnozziq",
  "qiwoh guppz",
]);

const smsGatewayDomains = new Set([
  "txt.att.net",
  "vtext.com",
  "tmomail.net",
  "messaging.sprintpcs.com",
  "vmobl.com",
  "mmst5.tracfone.com",
]);

function normalizedName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const rows = await db.select().from(users);
  let grandfathered = 0;
  let flagged = 0;

  await db.transaction(async (tx) => {
    for (const user of rows) {
      const reasons = Array.isArray(user.riskReasons) ? [...user.riskReasons as string[]] : [];
      const domain = user.email.toLowerCase().split("@")[1] || "";
      const matchedReasons = [...reasons];
      if (suspiciousNames.has(normalizedName(user.firstName, user.lastName))) matchedReasons.push("known-suspicious-name");
      if (smsGatewayDomains.has(domain)) matchedReasons.push("sms-gateway-email");
      const nextReasons = Array.from(new Set(matchedReasons));
      const shouldFlag = nextReasons.length > 0;
      const nextStatus = shouldFlag ? "suspicious" : (user.accountStatus === "unverified" ? "legitimate" : user.accountStatus);
      const nextVerifiedAt = user.emailVerifiedAt || user.createdAt;
      if (shouldFlag || user.accountStatus === "unverified" || !user.emailVerifiedAt) {
        await tx.update(users).set({
          accountStatus: nextStatus,
          emailVerifiedAt: nextVerifiedAt,
          riskReasons: nextReasons,
        }).where(eq(users.id, user.id));
        if (shouldFlag) {
          await tx.insert(memberAuditEvents).values({
            userId: user.id,
            targetType: "user",
            targetId: user.id,
            action: "account_flagged_by_migration",
            before: { accountStatus: user.accountStatus, emailVerifiedAt: user.emailVerifiedAt },
            after: { accountStatus: nextStatus, emailVerifiedAt: nextVerifiedAt },
            reason: nextReasons.join(", "),
          });
          flagged++;
        } else {
          grandfathered++;
        }
      }
    }
  });

  console.log(JSON.stringify({ scanned: rows.length, grandfathered, flagged }));
}

main().finally(() => pool.end());