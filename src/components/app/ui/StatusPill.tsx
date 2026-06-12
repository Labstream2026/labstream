import type {
  DeliverableStatus,
  ProjectStatus,
  PhaseStatus,
} from "@prisma/client";

/**
 * Pill de estado consistente con icono + color + texto en español.
 * Reusable en proyectos, entregables, fases y tareas. Las tareas usan estados
 * EDITABLES (TaskStage): se renderizan con `override` (label+color propios); las
 * claves por defecto siguen aquí como respaldo.
 */

type Status =
  | DeliverableStatus
  | ProjectStatus
  | PhaseStatus
  | "TODO"
  | "DOING"
  | "REVIEW"
  | "DONE"
  | "BLOCKED"
  | "EXPIRED"
  | "REVOKED";

type Style = {
  bg: string;
  border: string;
  color: string;
  icon: string;
  label: string;
};

const STYLES: Record<Status, Style> = {
  // Project
  DRAFT: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", icon: "○", label: "Borrador" },
  ACTIVE: { bg: "rgba(52,199,89,0.12)", border: "rgba(52,199,89,0.30)", color: "#7DEEA0", icon: "●", label: "Activo" },
  ON_HOLD: { bg: "rgba(255,214,10,0.10)", border: "rgba(255,214,10,0.28)", color: "#F8D14B", icon: "❘❘", label: "En pausa" },
  COMPLETED: { bg: "rgba(123,97,255,0.13)", border: "rgba(123,97,255,0.30)", color: "#B6A4FF", icon: "✓", label: "Completado" },
  CANCELLED: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)", icon: "×", label: "Cancelado" },

  // Deliverable
  INTERNAL_REVIEW: { bg: "rgba(123,97,255,0.13)", border: "rgba(123,97,255,0.30)", color: "#B6A4FF", icon: "◐", label: "Revisión interna" },
  CLIENT_REVIEW: { bg: "rgba(232,100,12,0.15)", border: "rgba(232,100,12,0.40)", color: "var(--orange)", icon: "👁", label: "Esperando cliente" },
  CHANGES_REQUESTED: { bg: "rgba(239,68,68,0.13)", border: "rgba(239,68,68,0.30)", color: "#FCA5A5", icon: "↺", label: "Cambios solicitados" },
  APPROVED: { bg: "rgba(52,199,89,0.13)", border: "rgba(52,199,89,0.30)", color: "#7DEEA0", icon: "✓", label: "Aprobado" },

  // Phase
  PENDING: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)", icon: "○", label: "Pendiente" },

  // Task
  TODO: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)", icon: "○", label: "Por hacer" },
  DOING: { bg: "rgba(123,97,255,0.13)", border: "rgba(123,97,255,0.30)", color: "#B6A4FF", icon: "●", label: "En curso" },
  REVIEW: { bg: "rgba(232,100,12,0.13)", border: "rgba(232,100,12,0.30)", color: "var(--orange)", icon: "👁", label: "Revisión" },
  DONE: { bg: "rgba(52,199,89,0.13)", border: "rgba(52,199,89,0.30)", color: "#7DEEA0", icon: "✓", label: "Listo" },
  BLOCKED: { bg: "rgba(239,68,68,0.13)", border: "rgba(239,68,68,0.30)", color: "#FCA5A5", icon: "⊘", label: "Bloqueado" },

  // ReviewLink
  EXPIRED: { bg: "rgba(255,214,10,0.10)", border: "rgba(255,214,10,0.28)", color: "#F8D14B", icon: "⏱", label: "Expirado" },
  REVOKED: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)", color: "#FCA5A5", icon: "×", label: "Revocado" },
};

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { px: string; text: string; iconSize: string }> = {
  sm: { px: "px-2 py-0.5", text: "text-[11px]", iconSize: "text-[10px]" },
  md: { px: "px-2.5 py-1", text: "text-[12px]", iconSize: "text-[11px]" },
  lg: { px: "px-3.5 py-1.5", text: "text-[13.5px]", iconSize: "text-[12px]" },
};

/** Deriva un estilo de pill a partir de un solo color (para estados de tarea
 *  personalizables, cuyo color lo define el usuario). */
function styleFromColor(hex: string, label: string): Style {
  const h = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#9aa0a6";
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.14)`,
    border: `rgba(${r}, ${g}, ${b}, 0.34)`,
    color: h,
    icon: "●",
    label,
  };
}

export function StatusPill({
  status,
  size = "md",
  showIcon = true,
  className = "",
  override,
}: {
  status: string;
  size?: Size;
  showIcon?: boolean;
  className?: string;
  /** Para estados de tarea editables: color+label propios (no del enum). */
  override?: { label: string; color: string };
}) {
  const s = override
    ? styleFromColor(override.color, override.label)
    : STYLES[status as Status];
  if (!s) return null;
  const sz = SIZES[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${sz.px} ${sz.text} ${className}`}
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {showIcon && (
        <span aria-hidden className={sz.iconSize} style={{ lineHeight: 1 }}>
          {s.icon}
        </span>
      )}
      {s.label}
    </span>
  );
}

export function getStatusStyle(status: Status): Style | undefined {
  return STYLES[status];
}
