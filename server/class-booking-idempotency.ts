export type ReservationReplayIdentity = {
  occurrenceId: string;
  userId?: string | null;
  minorProfileId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function normalizeName(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function normalizeEmail(value: string | null | undefined) {
  return (value || "").trim().toLocaleLowerCase("en-US");
}

function normalizePhone(value: string | null | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function reservationReplayMatches(
  existing: ReservationReplayIdentity,
  requested: ReservationReplayIdentity,
) {
  if (existing.occurrenceId !== requested.occurrenceId
    || (existing.userId || null) !== (requested.userId || null)
    || (existing.minorProfileId || null) !== (requested.minorProfileId || null)) {
    return false;
  }

  // A member's stable account identity owns a member replay. Anonymous/public
  // requests instead have no account id, so require all supplied visitor
  // identity fields to match before returning any existing reservation data.
  if (requested.userId) return true;

  return normalizeName(existing.firstName) === normalizeName(requested.firstName)
    && normalizeName(existing.lastName) === normalizeName(requested.lastName)
    && normalizeEmail(existing.email) === normalizeEmail(requested.email)
    && normalizePhone(existing.phone) === normalizePhone(requested.phone);
}