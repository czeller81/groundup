import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { notificationOutbox, type NotificationOutbox } from "@shared/schema";
import { deliverResendEmail } from "./email";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 10 * 60;

export type NotificationDraft = {
  deduplicationKey: string;
  kind: string;
  recipient: string;
  subject: string;
  body: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
};

export async function enqueueNotification(
  tx: typeof db,
  draft: NotificationDraft,
) {
  await tx.insert(notificationOutbox).values({
    deduplicationKey: draft.deduplicationKey,
    kind: draft.kind,
    recipient: draft.recipient,
    fromAddress: "Ground Up <info@groundupbjj.com>",
    replyTo: draft.replyTo,
    subject: draft.subject,
    body: draft.body,
    metadata: draft.metadata || {},
  }).onConflictDoNothing({ target: notificationOutbox.deduplicationKey });
}

async function claimNotifications(limit: number) {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      with candidates as (
        select id
        from notification_outbox
        where (
          status in ('pending', 'failed_retryable')
          and available_at <= now()
        ) or (
          status = 'processing'
          and locked_until < now()
        )
        order by created_at asc
        for update skip locked
        limit ${Math.max(1, Math.min(limit, 100))}
      )
      update notification_outbox n
      set status = 'processing',
          attempts = n.attempts + 1,
          processing_started_at = now(),
          locked_until = now() + (${LOCK_SECONDS} * interval '1 second'),
          updated_at = now()
      from candidates
      where n.id = candidates.id
      returning n.*
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      deduplicationKey: row.deduplication_key,
      provider: row.provider,
      kind: row.kind,
      recipient: row.recipient,
      fromAddress: row.from_address,
      replyTo: row.reply_to,
      subject: row.subject,
      body: row.body,
      metadata: row.metadata,
      status: row.status,
      attempts: row.attempts,
      availableAt: row.available_at,
      processingStartedAt: row.processing_started_at,
      lockedUntil: row.locked_until,
      sentAt: row.sent_at,
      failedAt: row.failed_at,
      providerMessageId: row.provider_message_id,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as NotificationOutbox[];
  });
}

async function markNotificationSent(id: string, providerMessageId?: string) {
  await db.update(notificationOutbox).set({
    status: "sent",
    sentAt: new Date(),
    lockedUntil: null,
    updatedAt: new Date(),
    providerMessageId: providerMessageId || null,
    lastError: null,
  }).where(and(eq(notificationOutbox.id, id), eq(notificationOutbox.status, "processing")));
}

async function markNotificationFailed(notification: NotificationOutbox, error: unknown) {
  const terminal = notification.attempts >= MAX_ATTEMPTS;
  const delayMs = Math.min(30 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, notification.attempts - 1)));
  await db.update(notificationOutbox).set({
    status: terminal ? "failed_terminal" : "failed_retryable",
    availableAt: new Date(Date.now() + delayMs),
    failedAt: new Date(),
    lockedUntil: null,
    updatedAt: new Date(),
    lastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown notification delivery error",
  }).where(and(eq(notificationOutbox.id, notification.id), eq(notificationOutbox.status, "processing")));
}

export async function processNotificationOutboxBatch(
  send: (input: { to: string; from: string; replyTo?: string; subject: string; text: string }, idempotencyKey: string) => Promise<string | undefined> = async (input, key) =>
    deliverResendEmail({ to: input.to, from: input.from, replyTo: input.replyTo, subject: input.subject, text: input.text }, key),
) {
  const claimed = await claimNotifications(25);
  let sent = 0;
  let failed = 0;
  for (const notification of claimed) {
    try {
      const providerMessageId = await send({
        to: notification.recipient,
        from: notification.fromAddress,
        replyTo: notification.replyTo || undefined,
        subject: notification.subject,
        text: notification.body,
      }, notification.deduplicationKey);
      await markNotificationSent(notification.id, providerMessageId);
      sent += 1;
    } catch (error) {
      await markNotificationFailed(notification, error);
      failed += 1;
    }
  }
  return { claimed: claimed.length, sent, failed };
}

export function startNotificationOutboxMaintenance(log: (message: string) => void = console.log) {
  if (process.env.BOOKING_NOTIFICATIONS_ENABLED !== "true") {
    log("Booking notification outbox is disabled; set BOOKING_NOTIFICATIONS_ENABLED=true to enable provider delivery.");
    return;
  }
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await processNotificationOutboxBatch();
      if (summary.claimed) log(`Booking notification outbox processed claimed=${summary.claimed} sent=${summary.sent} failed=${summary.failed}`);
    } catch (error) {
      console.error("Booking notification outbox failed:", error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), 30_000);
  timer.unref();
}