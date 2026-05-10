import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

/**
 * Sistema de email con dos backends:
 *   1. SMTP (Synology / cualquier mail server)  ← preferido si SMTP_HOST está set
 *   2. Resend (https://resend.com)             ← fallback si Resend está set
 *   3. Log a consola                           ← último fallback en dev
 *
 * Para activar SMTP:
 *   SMTP_HOST=nas.labstreamsas.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false           # true para 465 (SSL implícito), false para 587 (STARTTLS)
 *   SMTP_USER=labstream@labstreamsas.com
 *   SMTP_PASS=...
 *   EMAIL_FROM="Labstream Studio <labstream@labstreamsas.com>"
 *
 * Para activar Resend (fallback):
 *   RESEND_API_KEY=...
 */

let smtpTransporter: Transporter | null = null;
let resendClient: Resend | null = null;
let smtpVerified: boolean | null = null;

function getSmtp(): Transporter | null {
  if (smtpTransporter !== null) return smtpTransporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure, // true=SSL implícito (465), false=STARTTLS si servidor lo soporta (587)
    auth: user && pass ? { user, pass } : undefined,
    // El cert del NAS puede ser self-signed; permitimos pero advertimos
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
  return smtpTransporter;
}

function getResend(): Resend | null {
  if (resendClient !== null) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendClient = new Resend(key);
  return resendClient;
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendResult = {
  ok: boolean;
  via?: "smtp" | "resend" | "log";
  error?: string;
  skipped?: boolean;
};

/**
 * Envía email. Estrategia:
 *   - SMTP primero (si está configurado). Si falla → Resend.
 *   - Resend si SMTP no está configurado.
 *   - Log a consola si nada está configurado.
 */
export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const from =
    process.env.EMAIL_FROM ?? "Labstream <onboarding@resend.dev>";

  const smtp = getSmtp();
  if (smtp) {
    try {
      // Verificación lazy (1 vez por proceso) — útil para debug en logs
      if (smtpVerified === null) {
        try {
          await smtp.verify();
          smtpVerified = true;
          console.log("[email] SMTP verified:", process.env.SMTP_HOST);
        } catch (e) {
          smtpVerified = false;
          console.warn("[email] SMTP verify failed:", e instanceof Error ? e.message : e);
        }
      }

      const info = await smtp.sendMail({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        replyTo: args.replyTo,
      });
      console.log(
        "[email] sent via SMTP",
        Array.isArray(args.to) ? args.to.join(",") : args.to,
        "msgId:",
        info.messageId,
      );
      return { ok: true, via: "smtp" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.warn("[email] SMTP failed, trying fallback:", msg);
      // Cae a Resend abajo
    }
  }

  const resend = getResend();
  if (resend) {
    try {
      const result = await resend.emails.send({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        replyTo: args.replyTo,
      });
      if (result.error) {
        console.error("[email] Resend error", result.error);
        return { ok: false, via: "resend", error: result.error.message };
      }
      console.log(
        "[email] sent via Resend",
        Array.isArray(args.to) ? args.to.join(",") : args.to,
      );
      return { ok: true, via: "resend" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("[email] Resend exception", msg);
      return { ok: false, via: "resend", error: msg };
    }
  }

  // Sin backend — modo dev
  console.log("[email] no backend configured, would have sent:", {
    from,
    to: args.to,
    subject: args.subject,
  });
  return { ok: true, via: "log", skipped: true };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
