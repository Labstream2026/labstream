"use client";

import { useState } from "react";

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (r.ok) {
        setStatus("ok");
        setEmail("");
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:border-orange/50 focus:outline-none"
          disabled={status === "loading" || status === "ok"}
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "ok"}
          className="rounded-full bg-orange px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading"
            ? "Enviando…"
            : status === "ok"
              ? "✓ Inscrito"
              : "Suscribirme"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-[11px] text-red-300">No pudimos guardar tu email. Intenta de nuevo.</p>
      )}
      {status === "ok" && (
        <p className="text-[11px] text-green-300">
          Listo. Recibirás novedades cada cierto tiempo.
        </p>
      )}
    </form>
  );
}
