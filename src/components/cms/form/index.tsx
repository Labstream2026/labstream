import Link from "next/link";

export { FormShortcuts } from "./FormShortcuts";
export { SectionNav } from "./SectionNav";

// ─── Page header ────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6">
      <div>
        {eyebrow && (
          <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
            {eyebrow}
          </div>
        )}
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-[14px] text-white/55">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

// ─── Back link + view-public-page row ───────────────────────────────

export function EditorToolbar({
  backHref,
  backLabel,
  publicHref,
  publicLabel = "Ver en sitio público ↗",
}: {
  backHref: string;
  backLabel: string;
  publicHref?: string;
  publicLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Link
        href={backHref}
        className="text-[12px] text-white/55 hover:text-white"
      >
        ← {backLabel}
      </Link>
      {publicHref && (
        <Link
          href={publicHref}
          target="_blank"
          className="text-[12px] text-orange hover:underline"
        >
          {publicLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Form section ───────────────────────────────────────────────────

export function Section({
  title,
  help,
  id,
  children,
}: {
  title: string;
  help?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-3 border-t border-white/5 pt-5 first:border-0 first:pt-0"
    >
      <div>
        <div className="text-[14px] font-semibold text-white">{title}</div>
        {help && <div className="mt-0.5 text-[12px] text-white/45">{help}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Field (label + control + help + error) ─────────────────────────

export function Field({
  label,
  help,
  error,
  required,
  wide,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
        {required && <span className="text-orange">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] font-medium text-red-300">{error}</span>
      ) : help ? (
        <span className="text-[11px] text-white/40">{help}</span>
      ) : null}
    </label>
  );
}

// ─── Styled inputs ──────────────────────────────────────────────────

const inputBase =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none disabled:opacity-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
    />
  );
}

export function Textarea({
  mono,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) {
  return (
    <textarea
      {...rest}
      className={`${inputBase} leading-relaxed ${mono ? "font-mono text-[12px]" : ""} ${rest.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputBase} ${props.className ?? ""}`} />
  );
}

// ─── Status badge ───────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  PUBLISHED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0", label: "Publicado" },
  DRAFT: { bg: "rgba(245,158,11,0.13)", color: "#FBC272", label: "Borrador" },
  REVIEW: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF", label: "En revisión" },
  ACTIVE: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0", label: "Activo" },
  PENDING: { bg: "rgba(245,158,11,0.13)", color: "#FBC272", label: "Pendiente" },
  COMPLETED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0", label: "Completado" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? {
    bg: "rgba(255,255,255,0.08)",
    color: "#E5E5E5",
    label: status,
  };
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Form actions footer (cancel + save) ────────────────────────────

export function FormActions({
  cancelHref,
  cancelLabel = "Cancelar",
  submitLabel = "Guardar cambios",
}: {
  cancelHref?: string;
  cancelLabel?: string;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
      {cancelHref && (
        <Link
          href={cancelHref}
          className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] text-white/70 hover:bg-white/5"
        >
          {cancelLabel}
        </Link>
      )}
      <button
        type="submit"
        className="btn-primary"
        title="Atajo: ⌘+S (Mac) o Ctrl+S"
      >
        {submitLabel}
      </button>
    </div>
  );
}
