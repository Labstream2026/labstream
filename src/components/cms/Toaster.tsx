"use client";

import { useEffect, useState } from "react";

type ToastKind = "success" | "error" | "info";

type Props = {
  /** Initial toast injected by the server from the flash cookie. */
  initial?: { kind: ToastKind; message: string } | null;
};

export function CmsToaster({ initial }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const hasInitial = !!initial;
  const isError = initial?.kind === "error";

  // Clear the flash cookie after first paint so reloading doesn't re-show it,
  // and schedule auto-dismiss. Empty deps so the timer is established only once
  // per mount — re-renders with a freshly-constructed `initial` object (new
  // reference each layout render) don't reset the dismissal timer.
  useEffect(() => {
    if (!hasInitial) return;
    document.cookie = "cms_flash=; path=/; max-age=0; samesite=lax";
    const t = window.setTimeout(
      () => setDismissed(true),
      isError ? 6000 : 3000,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initial || dismissed) return null;

  const borderClass =
    initial.kind === "success"
      ? "border-green-500/30"
      : initial.kind === "error"
        ? "border-red-500/30"
        : "border-white/10";
  const dotClass =
    initial.kind === "success"
      ? "bg-green-400"
      : initial.kind === "error"
        ? "bg-red-400"
        : "bg-white/50";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[320px] flex-col gap-2"
    >
      <div
        role={initial.kind === "error" ? "alert" : "status"}
        className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#141414] px-4 py-3 shadow-2xl ${borderClass}`}
        style={{
          animation:
            "cms-toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1), cms-toast-out 220ms cubic-bezier(0.4, 0, 1, 1) " +
            (initial.kind === "error" ? "5780ms" : "2780ms") +
            " forwards",
        }}
      >
        <span
          className={`mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`}
        />
        <p className="flex-1 text-[13px] leading-relaxed text-white">
          {initial.message}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="text-[16px] leading-none text-white/40 hover:text-white"
        >
          ×
        </button>
      </div>
      <style>{`
        @keyframes cms-toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes cms-toast-out {
          to { opacity: 0; transform: translateX(20px); }
        }
      `}</style>
    </div>
  );
}
