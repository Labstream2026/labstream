"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "@/components/Icons";

const SERVICES = [
  "Producción Audiovisual",
  "Fotografía",
  "Contenido para Redes",
  "IA Aplicada",
  "Livestreaming",
  "Post-producción",
  "Otro / no estoy seguro",
];

const BUDGETS = ["< $5M", "$5M – $20M", "$20M – $50M", "$50M+", "Sin definir"];

export function ContactForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    service: "",
    budget: "",
    timeline: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof data, v: string) =>
    setData((d) => ({ ...d, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: `[Contacto formulario web]
Empresa: ${data.company || "—"}
Teléfono: ${data.phone || "—"}
Servicio: ${data.service || "—"}
Presupuesto: ${data.budget || "—"}
Cronograma: ${data.timeline || "—"}

${data.message}`,
        }),
      });
      if (r.ok) setDone(true);
      else setError("No fue posible enviar. Intenta de nuevo.");
    } catch {
      setError("No fue posible enviar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg rounded-3xl p-10 text-center"
      >
        <div className="mb-4 text-5xl">✨</div>
        <h3
          className="mb-3 font-heading italic text-white"
          style={{ fontSize: 32, lineHeight: 1.1 }}
        >
          ¡Mensaje recibido!
        </h3>
        <p className="mb-6 text-[14px] text-white/70">
          Te contactaremos en menos de 24 horas. Mientras, puedes ver nuestro{" "}
          <a href="/portafolio" className="text-orange hover:underline">
            portafolio
          </a>
          .
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="lg flex flex-col gap-5 rounded-3xl p-6 md:p-8">
      {/* Indicador de paso */}
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/45">
        <span className={step >= 1 ? "text-orange" : ""}>01 Sobre ti</span>
        <span>·</span>
        <span className={step >= 2 ? "text-orange" : ""}>02 Proyecto</span>
        <span>·</span>
        <span className={step >= 3 ? "text-orange" : ""}>03 Detalles</span>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <Field label="Tu nombre" value={data.name} onChange={(v) => set("name", v)} required />
            <Field label="Empresa (opcional)" value={data.company} onChange={(v) => set("company", v)} />
            <Field label="Email" type="email" value={data.email} onChange={(v) => set("email", v)} required />
            <Field label="WhatsApp / teléfono (opcional)" value={data.phone} onChange={(v) => set("phone", v)} />

            <button
              type="button"
              onClick={() => {
                if (data.name && data.email) setStep(2);
              }}
              disabled={!data.name || !data.email}
              className="btn-primary mt-2 self-start disabled:opacity-50"
            >
              Continuar →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5"
          >
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/55">
                ¿Qué servicio te interesa?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("service", s)}
                    className={`rounded-xl border px-3 py-3 text-left text-[12px] transition-all ${
                      data.service === s
                        ? "border-orange/50 bg-orange/10 text-orange"
                        : "border-white/10 text-white/75 hover:bg-white/5"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/55">
                Presupuesto aproximado (COP)
              </label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set("budget", b)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                      data.budget === b
                        ? "border-orange/50 bg-orange/10 text-orange"
                        : "border-white/10 text-white/75 hover:bg-white/5"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="¿Para cuándo lo necesitas?"
              value={data.timeline}
              onChange={(v) => set("timeline", v)}
              placeholder="Ej: noviembre 2026"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-white/10 px-5 py-3 text-[13px] text-white/70 hover:bg-white/5"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!data.service}
                className="btn-primary disabled:opacity-50"
              >
                Continuar →
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                Cuéntanos sobre tu proyecto
              </span>
              <textarea
                value={data.message}
                onChange={(e) => set("message", e.target.value)}
                rows={6}
                required
                placeholder="Lo que tengas claro: idea, objetivo, audiencia, referencias visuales…"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white focus:border-orange/50 focus:outline-none"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full border border-white/10 px-5 py-3 text-[13px] text-white/70 hover:bg-white/5"
                disabled={submitting}
              >
                ← Volver
              </button>
              <button
                type="submit"
                disabled={submitting || !data.message}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Enviar mensaje"}
                <ArrowUpRight />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white focus:border-orange/50 focus:outline-none"
      />
    </label>
  );
}
