import { randomBytes } from "crypto";
import { ProposalStatus } from "@prisma/client";

// ─── Tipos de las estructuras JSON de una propuesta ──────────────────

export type StatItem = { value: string; label: string };
export type SelectedWorkItem = { title: string; client?: string; imageUrl?: string };
export type TreatmentSection = { heading: string; body?: string; imageUrl?: string };
export type MoodboardItem = { url: string; alt?: string };
export type ReferenceItem = { title: string; url: string };
export type TimelineItem = { phase: string; dateLabel?: string; desc?: string };
export type DeliverableRow = { item: string; detail?: string; qty?: string };
export type BudgetItem = {
  concept: string;
  detail?: string;
  qty?: string;
  unitPrice?: string;
};

// ─── Labels ──────────────────────────────────────────────────────────

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  DECLINED: "Rechazada",
  EXPIRED: "Vencida",
};

export const PROPOSAL_STATUS_STYLES: Record<
  ProposalStatus,
  { bg: string; color: string }
> = {
  DRAFT: { bg: "rgba(245,158,11,0.13)", color: "#FBC272" },
  SENT: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
  ACCEPTED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
  DECLINED: { bg: "rgba(239,68,68,0.13)", color: "#FCA5A5" },
  EXPIRED: { bg: "rgba(255,255,255,0.08)", color: "#C9C9C9" },
};

// ─── Dinero ──────────────────────────────────────────────────────────

/** Convierte un string ("1.200.000", "$1,200,000", "1200000") a número. */
export function parseMoney(raw: string | undefined | null): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;
  // Quitamos separadores de miles dejando solo dígitos (montos enteros COP).
  const digits = cleaned.replace(/[.,]/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function parseQty(raw: string | undefined | null): number {
  if (!raw) return 1;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function formatMoney(amount: number, currency = "COP"): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString("es-CO")}`;
  }
}

export type BudgetTotals = {
  lines: Array<BudgetItem & { lineTotal: number }>;
  subtotal: number;
  taxRatePct: number;
  taxAmount: number;
  total: number;
};

/** Calcula subtotal, impuesto y total de las líneas del presupuesto. */
export function computeBudget(
  items: BudgetItem[] | null | undefined,
  taxRatePct: number | null | undefined,
): BudgetTotals {
  const lines = (items ?? []).map((it) => ({
    ...it,
    lineTotal: parseMoney(it.unitPrice) * parseQty(it.qty),
  }));
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const rate = taxRatePct && taxRatePct > 0 ? taxRatePct : 0;
  const taxAmount = Math.round((subtotal * rate) / 100);
  return { lines, subtotal, taxRatePct: rate, taxAmount, total: subtotal + taxAmount };
}

// ─── Slug / código ───────────────────────────────────────────────────

/** Token público corto e impredecible para la URL de la propuesta. */
export function makeProposalSlug(seed: string): string {
  const base = seed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  // Sufijo aleatorio CRIPTOGRÁFICO: la propuesta pública no tiene auth, así que
  // el slug ES el control de acceso a datos confidenciales (presupuesto, cliente).
  // 12 chars base64url (~72 bits) — no adivinable ni enumerable.
  const rand = randomBytes(9).toString("base64url");
  return base ? `${base}-${rand}` : rand;
}
