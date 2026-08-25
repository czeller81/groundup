import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
const STAFF_EMAIL = "info@groundupbjj.com";

export async function sendStaffNotificationEmail(input: {
  subject: string;
  text: string;
  inboxPath: string;
}) {
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [STAFF_EMAIL],
      subject: input.subject,
      text: `${input.text}\n\nOpen in portal: ${input.inboxPath}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}