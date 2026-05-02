import { Resend } from "resend";

let cached: Resend | null = null;

function client(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(args: SendArgs): Promise<{
  ok: boolean;
  error?: string;
  skipped?: boolean;
}> {
  const c = client();
  const from = process.env.EMAIL_FROM ?? "Labstream <onboarding@resend.dev>";

  if (!c) {
    console.log("[email] RESEND_API_KEY not set — would have sent:", {
      from,
      to: args.to,
      subject: args.subject,
    });
    return { ok: true, skipped: true };
  }

  try {
    const result = await c.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });

    if (result.error) {
      console.error("[email] resend error", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[email] exception", msg);
    return { ok: false, error: msg };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
