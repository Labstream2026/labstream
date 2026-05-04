"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Play } from "@/components/Icons";

type Props = {
  badge?: { tag: string; text: string };
  title: string;
  subtitle: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  backgroundImage?: string;
  backgroundVideo?: string;
};

export function HomeHero({
  badge = { tag: "2026", text: "Producción audiovisual + IA" },
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  backgroundImage,
  backgroundVideo,
}: Props) {
  return (
    <section
      id="home"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100vh", background: "#000" }}
    >
      {backgroundVideo ? (
        <video
          src={backgroundVideo}
          poster={backgroundImage}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : backgroundImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(232,100,12,0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(123,97,255,0.10), transparent 50%)",
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.55) 35%, rgba(8,8,8,0.95) 100%), radial-gradient(ellipse at 50% 30%, rgba(232,100,12,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {badge && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg mb-8 flex items-center gap-2 rounded-full p-1"
          >
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">
              {badge.tag}
            </span>
            <span className="pr-3 text-[13px] text-white/90">{badge.text}</span>
          </motion.div>
        )}

        <h1
          className="font-heading italic text-white"
          style={{
            fontSize: "clamp(48px,8vw,120px)",
            lineHeight: 0.92,
            letterSpacing: "-2px",
            maxWidth: "12ch",
          }}
        >
          {title.split(" ").map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.35 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "inline-block", marginRight: "0.25em" }}
            >
              {w}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.95 }}
          className="mt-7 max-w-xl text-[15px] font-light leading-relaxed text-white/85 md:text-[17px]"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.15 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href={ctaPrimary.href}
            className="lg-strong flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold text-white transition-transform hover:scale-105"
          >
            {ctaPrimary.label}
            <ArrowUpRight />
          </Link>
          {ctaSecondary && (
            <Link
              href={ctaSecondary.href}
              className="flex items-center gap-2 px-3 py-2 text-[14px] font-medium text-white/90 hover:text-white"
            >
              {ctaSecondary.label}
              <Play className="h-3.5 w-3.5" />
            </Link>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-px bg-white/30"
          />
        </motion.div>
      </div>
    </section>
  );
}
