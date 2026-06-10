"use client";

import type { FaqItem } from "@prisma/client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FaqAccordion({
  items,
  eyebrow = "Preguntas frecuentes",
  heading = "¿Tienes dudas?",
}: {
  items: FaqItem[];
  eyebrow?: string;
  heading?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return null;

  return (
    <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
            {"// "}{eyebrow}
          </p>
          <h2
            className="font-heading text-white"
            style={{
              fontSize: "clamp(32px,4.5vw,56px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
            }}
          >
            {heading}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {items.map((it) => {
            const isOpen = open === it.id;
            return (
              <div
                key={it.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : it.id)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-medium text-white">
                    {it.question}
                  </span>
                  <span
                    className="mt-1 text-[20px] leading-none text-orange transition-transform"
                    style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                  >
                    +
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-5 pb-4 pt-1 text-[14px] leading-relaxed text-white/70">
                        {it.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
