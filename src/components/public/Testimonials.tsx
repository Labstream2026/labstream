"use client";

import type { Testimonial } from "@prisma/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Testimonials({
  items,
  eyebrow = "Lo que dicen",
  heading = "Trabajamos con marcas exigentes",
  autoplay = true,
  intervalSeconds = 7,
}: {
  items: Testimonial[];
  eyebrow?: string;
  heading?: string;
  autoplay?: boolean;
  intervalSeconds?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || items.length <= 1 || paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(t);
  }, [autoplay, intervalSeconds, items.length, paused]);

  if (items.length === 0) return null;
  const current = items[index];

  return (
    <section
      className="px-6 py-24 md:py-32"
      style={{ background: "var(--bg-2)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
          {"// "}{eyebrow}
        </p>
        <h2
          className="mb-12 font-heading text-white"
          style={{
            fontSize: "clamp(32px,4.5vw,56px)",
            lineHeight: 1.05,
            letterSpacing: "-1px",
          }}
        >
          {heading}
        </h2>

        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <blockquote
                className="font-heading italic text-white"
                style={{
                  fontSize: "clamp(22px,2.6vw,32px)",
                  lineHeight: 1.4,
                  maxWidth: 800,
                }}
              >
                &ldquo;{current.body}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                {current.authorAvatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.authorAvatarUrl}
                    alt={current.authorName}
                    className="h-12 w-12 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="text-left">
                  <div className="text-[14px] font-semibold text-white">
                    {current.authorName}
                  </div>
                  <div className="text-[12px] text-white/55">
                    {current.authorRole}
                    {current.authorCompany ? ` · ${current.authorCompany}` : ""}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {items.length > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Testimonio ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-orange" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
