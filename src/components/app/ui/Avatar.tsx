import type { UserKind } from "@prisma/client";

/**
 * Avatar component reutilizable.
 * - Si hay imageUrl → la usa
 * - Si no → iniciales sobre fondo coloreado por UserKind (cliente, productor, equipo, admin)
 * - Si no hay kind → color derivado del hash del nombre (consistente)
 */

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { px: number; font: number }> = {
  xs: { px: 20, font: 9 },
  sm: { px: 28, font: 11 },
  md: { px: 36, font: 13 },
  lg: { px: 48, font: 16 },
  xl: { px: 64, font: 22 },
};

// Colores por rol — el cliente es morado (suave, no aggressive),
// admin naranja (igual al brand), productor cyan, equipo gris.
const KIND_COLORS: Record<UserKind, { bg: string; fg: string; ring: string }> = {
  ADMIN:        { bg: "rgba(232,100,12,0.22)", fg: "#FFB57A", ring: "rgba(232,100,12,0.45)" },
  CMS_EDITOR:   { bg: "rgba(123,97,255,0.22)", fg: "#C4B6FF", ring: "rgba(123,97,255,0.4)" },
  CMS_REVIEWER: { bg: "rgba(123,97,255,0.15)", fg: "#B6A4FF", ring: "rgba(123,97,255,0.3)" },
  PRODUCER:     { bg: "rgba(90,200,250,0.22)", fg: "#9AD8F5", ring: "rgba(90,200,250,0.4)" },
  TEAM:         { bg: "rgba(255,255,255,0.10)", fg: "rgba(255,255,255,0.85)", ring: "rgba(255,255,255,0.18)" },
  CLIENT:       { bg: "rgba(123,97,255,0.18)", fg: "#B6A4FF", ring: "rgba(123,97,255,0.35)" },
};

// Paleta de fallback cuando no hay kind (deriva del hash del nombre)
const FALLBACK_PALETTE: Array<{ bg: string; fg: string; ring: string }> = [
  { bg: "rgba(232,100,12,0.18)",  fg: "#FFB57A", ring: "rgba(232,100,12,0.35)" },
  { bg: "rgba(123,97,255,0.18)",  fg: "#B6A4FF", ring: "rgba(123,97,255,0.35)" },
  { bg: "rgba(90,200,250,0.18)",  fg: "#9AD8F5", ring: "rgba(90,200,250,0.35)" },
  { bg: "rgba(52,199,89,0.18)",   fg: "#7DEEA0", ring: "rgba(52,199,89,0.35)" },
  { bg: "rgba(255,214,10,0.18)",  fg: "#F8D14B", ring: "rgba(255,214,10,0.35)" },
  { bg: "rgba(255,59,48,0.16)",   fg: "#FCA5A5", ring: "rgba(255,59,48,0.30)" },
];

function deriveInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const p = parts[0];
    if (p.includes("@")) {
      // email → primera letra del local
      return p[0].toUpperCase();
    }
    return p.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

type Props = {
  name: string | null | undefined;
  email?: string | null;
  kind?: UserKind | null;
  imageUrl?: string | null;
  size?: Size;
  ring?: boolean;       // borde sutil del color del rol
  title?: string;       // tooltip; default = name o email
  className?: string;
};

export function Avatar({
  name,
  email,
  kind,
  imageUrl,
  size = "md",
  ring = false,
  title,
  className = "",
}: Props) {
  const display = name ?? email ?? "Usuario";
  const initials = deriveInitials(display);
  const sz = SIZES[size];

  const palette = kind
    ? KIND_COLORS[kind]
    : FALLBACK_PALETTE[hashIndex(display, FALLBACK_PALETTE.length)];

  const tip = title ?? display;

  if (imageUrl) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
        style={{
          width: sz.px,
          height: sz.px,
          boxShadow: ring ? `0 0 0 2px ${palette.ring}` : undefined,
        }}
        title={tip}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={display}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: sz.px,
        height: sz.px,
        fontSize: sz.font,
        background: palette.bg,
        color: palette.fg,
        boxShadow: ring ? `0 0 0 2px ${palette.ring}` : undefined,
        letterSpacing: "0.02em",
      }}
      title={tip}
      aria-label={display}
    >
      {initials}
    </span>
  );
}

/**
 * Stack de avatares (max N visible, resto como "+X").
 */
export function AvatarStack({
  people,
  size = "sm",
  max = 4,
  className = "",
}: {
  people: Array<{
    name: string | null | undefined;
    email?: string | null;
    kind?: UserKind | null;
    imageUrl?: string | null;
  }>;
  size?: Size;
  max?: number;
  className?: string;
}) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const sz = SIZES[size];

  return (
    <div className={`inline-flex items-center ${className}`}>
      {visible.map((p, i) => (
        <span
          key={i}
          style={{ marginLeft: i === 0 ? 0 : -sz.px / 3.5, zIndex: visible.length - i }}
          className="relative"
        >
          <Avatar
            name={p.name}
            email={p.email}
            kind={p.kind}
            imageUrl={p.imageUrl}
            size={size}
            className="ring-2 ring-[var(--bg)]"
          />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="relative inline-flex items-center justify-center rounded-full bg-white/10 font-semibold text-white/70 ring-2 ring-[var(--bg)]"
          style={{
            width: sz.px,
            height: sz.px,
            fontSize: sz.font - 1,
            marginLeft: -sz.px / 3.5,
          }}
          title={`${overflow} más`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
