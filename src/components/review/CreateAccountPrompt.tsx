"use client";

import { useState } from "react";

type Props = {
  guestName: string;
  guestEmail: string;
  reviewSlug: string;
  onDismiss: () => void;
};

/**
 * Banner que aparece después del primer comentario de un invitado, ofreciéndole
 * crear cuenta para tener acceso permanente. POST a /api/review/[slug]/request-access
 * notifica al admin para que cree el usuario manualmente.
 */
export function CreateAccountPrompt({ guestName, guestEmail, reviewSlug, onDismiss }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function request() {
    setState("sending");
    try {
      const r = await fetch(`/api/review/${reviewSlug}/request-access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: guestName, email: guestEmail }),
      });
      if (!r.ok) throw new Error("send_failed");
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div
        className="rounded-xl p-3 text-[12.5px]"
        style={{
          border: "1px solid rgba(52,199,89,0.35)",
          background: "rgba(52,199,89,0.07)",
          color: "#9DEEB1",
        }}
      >
        ✓ Listo. Avisamos al equipo. Recibirás un email cuando tu cuenta esté lista.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{
        border: "1px solid rgba(232,100,12,0.35)",
        background: "linear-gradient(180deg, rgba(232,100,12,0.07), transparent 80%)",
      }}
    >
      <div className="text-[12.5px] font-medium text-white">
        ¡Gracias, {guestName.split(" ")[0]}!
      </div>
      <p className="mt-0.5 text-[11.5px] leading-snug text-white/70">
        ¿Quieres una cuenta para ver el historial de tus proyectos y revisar
        sin que te pasen un link cada vez?
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={request}
          disabled={state === "sending"}
          className="rounded-full bg-orange px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-orange/90 disabled:opacity-50"
        >
          {state === "sending" ? "Enviando…" : "Sí, crear cuenta"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-medium text-white/85 hover:bg-white/10"
        >
          No, gracias
        </button>
      </div>
      {state === "error" && (
        <p className="mt-1.5 text-[10.5px] text-red-300">
          No pudimos enviar la solicitud. Intenta más tarde.
        </p>
      )}
    </div>
  );
}
