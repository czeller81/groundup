import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";

type AggregateRow = {
  total: string | number;
  protected: string | number;
  high_confidence_synthetic: string | number;
  suspicious_review: string | number;
  legitimate_or_unclassified: string | number;
  example_invalid: string | number;
  test_signal: string | number;
  with_signal_hashes: string | number;
};

function numberValue(value: string | number) {
  return Number(value);
}

async function main() {
  const result = await db.execute(sql`
    WITH activity AS (
      SELECT
        u.id,
        lower(u.email) LIKE '%@example.invalid' AS example_invalid,
        lower(u.risk_reasons::text) LIKE '%test-signal%' AS test_signal,
        (
          u.account_status IN ('suspicious', 'needs_review')
          OR jsonb_array_length(COALESCE(u.risk_reasons, '[]'::jsonb)) > 0
        ) AS suspicious_review,
        (
          EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = u.id)
          OR EXISTS (SELECT 1 FROM class_reservations cr WHERE cr.user_id = u.id)
          OR EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id)
          OR EXISTS (SELECT 1 FROM form_responses fr WHERE fr.user_id = u.id)
          OR EXISTS (SELECT 1 FROM discovery_passes dp WHERE dp.user_id = u.id)
          OR EXISTS (
            SELECT 1
            FROM discovery_passes dp
            JOIN discovery_entitlements de ON de.discovery_pass_id = dp.id
            WHERE dp.user_id = u.id
          )
          OR EXISTS (SELECT 1 FROM entitlement_ledger el WHERE el.user_id = u.id)
          OR EXISTS (SELECT 1 FROM session_notes sn WHERE sn.user_id = u.id)
          OR EXISTS (SELECT 1 FROM member_audit_events mae WHERE mae.user_id = u.id)
          OR EXISTS (SELECT 1 FROM member_lifecycles ml WHERE ml.user_id = u.id)
          OR EXISTS (SELECT 1 FROM member_goals mg WHERE mg.user_id = u.id)
          OR EXISTS (SELECT 1 FROM emergency_contacts ec WHERE ec.user_id = u.id)
          OR EXISTS (SELECT 1 FROM minor_profiles mp WHERE mp.guardian_user_id = u.id)
        ) AS protected,
        (u.signup_ip_hash IS NOT NULL OR u.signup_device_hash IS NOT NULL) AS with_signal_hashes
      FROM users u
    )
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE protected)::int AS protected,
      COUNT(*) FILTER (WHERE example_invalid AND NOT protected)::int AS high_confidence_synthetic,
      COUNT(*) FILTER (WHERE suspicious_review AND NOT protected)::int AS suspicious_review,
      COUNT(*) FILTER (WHERE NOT protected AND NOT example_invalid AND NOT suspicious_review)::int AS legitimate_or_unclassified,
      COUNT(*) FILTER (WHERE example_invalid)::int AS example_invalid,
      COUNT(*) FILTER (WHERE test_signal)::int AS test_signal,
      COUNT(*) FILTER (WHERE with_signal_hashes)::int AS with_signal_hashes
    FROM activity
  `);

  const row = result.rows[0] as unknown as AggregateRow | undefined;
  if (!row) throw new Error("No account cleanup aggregate was returned");

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    piiIncluded: false,
    deletionPerformed: false,
    totals: {
      users: numberValue(row.total),
      protectedFromCleanup: numberValue(row.protected),
      highConfidenceSyntheticCandidates: numberValue(row.high_confidence_synthetic),
      suspiciousReviewCandidates: numberValue(row.suspicious_review),
      legitimateOrUnclassifiedCandidates: numberValue(row.legitimate_or_unclassified),
      exampleInvalidMarkerCount: numberValue(row.example_invalid),
      testSignalOccurrenceCount: numberValue(row.test_signal),
      accountsWithSignupSignalHashes: numberValue(row.with_signal_hashes),
    },
    policy: {
      protectAnyAccountWithActivity: true,
      protectedActivity: [
        "membership",
        "payment-linked or legacy booking",
        "class reservation",
        "submitted form",
        "Discovery Pass or entitlement",
        "attendance/entitlement ledger",
        "staff note or audit history",
        "member lifecycle, goal, emergency contact, or guardian profile",
      ],
      nextStep: "Export candidate aggregate, quarantine or disable reversibly, observe, review, then delete only with explicit approval.",
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error("Account cleanup report failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
