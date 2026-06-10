"use client";

import { useState } from "react";
import { ArrowUpRight } from "@/components/Icons";

export function Contact() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <section
      id="contact"
      className="relative px-6 py-32"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block text-[12px] font-mono tracking-widest text-orange">
            {"// Contacto"}
          </div>
          <h2
            className="font-heading text-white"
            style={{
              fontSize: "clamp(40px,5.5vw,72px)",
              lineHeight: 1,
              letterSpacing: "-1.5px",
            }}
          >
            Cuéntanos <span className="italic">tu proyecto</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] font-light text-white/70">
            El resto es nuestro trabajo. Escríbenos y respondemos en menos de
            24h.
          </p>
        </div>

        {sent ? (
          <div className="lg rounded-2xl p-10 text-center">
            <div
              className="mb-3 font-heading italic text-white"
              style={{ fontSize: 32 }}
            >
              ¡Mensaje enviado!
            </div>
            <p className="text-[14px] text-white/70">
              Te contactaremos en menos de 24h.
            </p>
          </div>
        ) : (
          <form
            className="lg flex flex-col gap-4 rounded-2xl p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              const fd = new FormData(e.currentTarget);
              try {
                await fetch("/api/contact", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(fd)),
                  headers: { "Content-Type": "application/json" },
                });
                setSent(true);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <input
              required
              name="name"
              placeholder="Nombre"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-[14px] text-white placeholder:text-white/35 focus:border-orange/50 focus:outline-none"
            />
            <input
              required
              type="email"
              name="email"
              placeholder="Email"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-[14px] text-white placeholder:text-white/35 focus:border-orange/50 focus:outline-none"
            />
            <textarea
              required
              name="message"
              rows={5}
              placeholder="Cuéntanos sobre tu proyecto…"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-[14px] text-white placeholder:text-white/35 focus:border-orange/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-2 self-start disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar mensaje"}
              <ArrowUpRight />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
