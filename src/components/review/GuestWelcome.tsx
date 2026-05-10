"use client";

import { useState } from "react";

type Props = {
  reviewTitle: string;
  message: string | null;
  requireEmail: boolean;
  onContinue: (data: { name: string; email: string }) => void;
};

/**
 * Pantalla de bienvenida para invitados que entran por primera vez.
 * Solo se muestra si no hay cookie de invitado global ni sesión.
 * Después de continuar, el ReviewPlayer toma control y guarda el perfil global.
 */
export function GuestWelcome({ reviewTitle, message, requireEmail, onContinue }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const valid =
    name.trim().length >= 2 &&
    (!requireEmail || /\S+@\S+\.\S+/.test(email));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onContinue({ name: name.trim(), email: email.trim() });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl p-7"
        style={{
          border: "1px solid rgba(232,100,12,0.3)",
          background:
            "linear-gradient(180deg, rgba(232,100,12,0.05), rgba(255,255,255,0.02) 80%)",
        }}
      >
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-orange">
          {"// Te invitaron a revisar"}
        </div>
        <h1
          className="mt-2 font-heading text-white"
          style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.5px" }}
        >
          {reviewTitle}
        </h1>
        {message && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/75">
            {message}
          </p>
        )}

        <p className="mt-4 text-[12.5px] leading-snug text-white/55">
          Antes de comentar, dinos quién eres. Solo te lo pediremos una vez —
          tu nombre quedará junto a cada nota que dejes.
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-white/45">
              Tu nombre
            </span>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido"
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] text-white placeholder-white/30 outline-none focus:border-orange/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-white/45">
              Email {requireEmail ? "" : <span className="lowercase opacity-60">(opcional)</span>}
            </span>
            <input
              type="email"
              required={requireEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@empresa.com"
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] text-white placeholder-white/30 outline-none focus:border-orange/50"
            />
          </label>

          {touched && !valid && (
            <p className="text-[11.5px] text-red-300">
              {name.trim().length < 2
                ? "Escribe tu nombre completo"
                : "Necesitamos un email válido"}
            </p>
          )}

          <button
            type="submit"
            disabled={!valid}
            className="mt-2 rounded-full bg-orange px-5 py-3 text-[14px] font-semibold text-white hover:bg-orange/90 disabled:opacity-40"
          >
            Entrar a revisar →
          </button>
        </form>

        <p className="mt-5 text-[11px] leading-snug text-white/40">
          No te pediremos contraseña. Si vuelves a entrar a este link o a otro
          que te compartan, te reconoceremos automáticamente.
        </p>
      </div>
    </div>
  );
}
