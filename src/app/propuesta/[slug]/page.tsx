import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight } from "@/components/Icons";
import {
  detectEmbedKind,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
  extractVimeoId,
  extractYouTubeId,
} from "@/lib/google-drive";
import { EmbedKind, ProposalStatus } from "@prisma/client";
import {
  computeBudget,
  formatMoney,
  type StatItem,
  type SelectedWorkItem,
  type TreatmentSection,
  type MoodboardItem,
  type ReferenceItem,
  type TimelineItem,
  type DeliverableRow,
  type BudgetItem,
} from "@/lib/proposals";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const p = await prisma.proposal.findUnique({ where: { slug } });
  if (!p) return { title: "Propuesta no encontrada" };
  return {
    title: `${p.title} · Propuesta para ${p.clientName}`,
    description: p.tagline ?? p.intro ?? undefined,
    robots: { index: false, follow: false },
    openGraph: { images: p.coverImageUrl ? [p.coverImageUrl] : [] },
  };
}

function paragraphs(text: string | null | undefined) {
  if (!text) return [];
  return text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
}

/** Solo permite http(s)/mailto/rutas internas; neutraliza javascript:, data:, etc. */
function safeHref(url: string | null | undefined): string {
  const trimmed = (url ?? "").trim();
  if (/^(https?:|mailto:|\/)/i.test(trimmed)) return trimmed;
  return "#";
}

function refEmbed(url: string): string | null {
  const detected = detectEmbedKind(url);
  if (detected.kind === EmbedKind.YOUTUBE) {
    const id = extractYouTubeId(url);
    if (id) return youtubeEmbedUrl(id);
  }
  if (detected.kind === EmbedKind.VIMEO) {
    const id = extractVimeoId(url);
    if (id) return vimeoEmbedUrl(id);
  }
  return null;
}

export default async function PublicProposalPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const p = await prisma.proposal.findUnique({ where: { slug } });
  if (!p) notFound();

  // La propuesta es un documento CONFIDENCIAL sin auth: el slug es el único
  // control de acceso. Solo se muestra públicamente si está enviada/aceptada
  // y no ha vencido. Borrador/rechazada/vencida → 404 (no filtrar precios ni
  // datos del cliente).
  const isPublic =
    (p.status === ProposalStatus.SENT || p.status === ProposalStatus.ACCEPTED) &&
    (!p.validUntil || p.validUntil >= new Date());
  if (!isPublic) notFound();

  // accentColor se interpola en `style` (template strings) servidos al cliente.
  // Validar a hex estricto evita inyección de CSS (exfiltración por url(), etc.).
  const accent = /^#[0-9a-fA-F]{6}$/.test(p.accentColor?.trim() ?? "")
    ? p.accentColor!.trim()
    : "#E8640C";

  const stats = (p.stats as StatItem[] | null) ?? [];
  const selectedWork = (p.selectedWork as SelectedWorkItem[] | null) ?? [];
  const treatmentSections = (p.treatmentSections as TreatmentSection[] | null) ?? [];
  const moodboard = (p.moodboard as MoodboardItem[] | null) ?? [];
  const references = (p.references as ReferenceItem[] | null) ?? [];
  const timeline = (p.timeline as TimelineItem[] | null) ?? [];
  const deliverables = (p.deliverables as DeliverableRow[] | null) ?? [];
  const budgetItems = (p.budgetItems as BudgetItem[] | null) ?? [];
  const budget = computeBudget(budgetItems, p.taxRatePct);

  const introParas = paragraphs(p.intro);
  const aboutParas = paragraphs(p.aboutBody);
  const treatmentParas = paragraphs(p.treatmentBody);

  const dateFmt = (d: Date) =>
    d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  const contactHref = p.clientEmail
    ? `mailto:${p.clientEmail}?subject=${encodeURIComponent(`Propuesta: ${p.title}`)}`
    : "/contacto";

  return (
    <main style={{ background: "var(--bg)" }}>
      <ScrollProgress />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="relative flex min-h-[88vh] flex-col">
          {p.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 90% at 50% 0%, ${accent}22 0%, transparent 55%), var(--bg)`,
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(8,8,8,0.98) 100%)",
            }}
          />

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
            <Logo size={1} />
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{ borderColor: `${accent}55`, color: accent }}
            >
              Propuesta
            </span>
          </div>

          {/* Hero content */}
          <div className="relative z-10 mt-auto px-6 pb-14 md:px-12 md:pb-20">
            <div className="mx-auto w-full max-w-6xl">
              <div
                className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: accent }}
              >
                Preparada para {p.clientName}
              </div>
              <h1
                className="font-heading italic text-white"
                style={{
                  fontSize: "clamp(40px,7vw,92px)",
                  lineHeight: 0.96,
                  letterSpacing: "-2px",
                  maxWidth: "18ch",
                }}
              >
                {p.title}
              </h1>
              {p.tagline && (
                <p className="mt-5 max-w-2xl text-[17px] font-light text-white/80 md:text-[20px]">
                  {p.tagline}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/60">
                {p.code && (
                  <span className="font-mono tracking-wider text-white/45">{p.code}</span>
                )}
                <span>{dateFmt(p.createdAt)}</span>
                {p.preparedBy && <span>Por {p.preparedBy}</span>}
                {p.validUntil && (
                  <span style={{ color: accent }}>Válida hasta {dateFmt(p.validUntil)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Intro / carta ── */}
      {introParas.length > 0 && (
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <ScrollReveal>
              <p className="mb-6 text-[12px] font-mono tracking-widest" style={{ color: accent }}>
                {"// Hola " + p.clientName}
              </p>
              <div className="flex flex-col gap-5">
                {introParas.map((para, i) => (
                  <p
                    key={i}
                    className="text-[19px] font-light leading-relaxed text-white/85 md:text-[22px]"
                  >
                    {para}
                  </p>
                ))}
              </div>
              {p.clientContact && (
                <p className="mt-8 text-[13px] text-white/50">Atención: {p.clientContact}</p>
              )}
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── Historia / track record ── */}
      {(p.aboutHeading || aboutParas.length > 0 || stats.length > 0 || selectedWork.length > 0) && (
        <section className="px-6 py-20" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <SectionLabel accent={accent}>Quiénes somos</SectionLabel>
              {p.aboutHeading && (
                <h2
                  className="mb-8 max-w-3xl font-heading text-white"
                  style={{ fontSize: "clamp(28px,4vw,48px)", lineHeight: 1.05, letterSpacing: "-1px" }}
                >
                  {p.aboutHeading}
                </h2>
              )}
            </ScrollReveal>

            {aboutParas.length > 0 && (
              <ScrollReveal delay={0.05}>
                <div className="grid max-w-4xl gap-4 md:grid-cols-2">
                  {aboutParas.map((para, i) => (
                    <p key={i} className="text-[15px] leading-relaxed text-white/75">
                      {para}
                    </p>
                  ))}
                </div>
              </ScrollReveal>
            )}

            {stats.length > 0 && (
              <ScrollReveal delay={0.1}>
                <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
                  {stats.map((s, i) => (
                    <div key={i} className="lg rounded-2xl p-5">
                      <div
                        className="font-heading text-white"
                        style={{ fontSize: 40, lineHeight: 1, letterSpacing: "-1px" }}
                      >
                        {s.value}
                      </div>
                      <div className="mt-2 text-[12px] uppercase tracking-wider text-white/50">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            )}

            {selectedWork.length > 0 && (
              <div className="mt-14">
                <ScrollReveal>
                  <p className="mb-5 text-[12px] font-mono tracking-widest" style={{ color: accent }}>
                    {"// Trabajos relevantes"}
                  </p>
                </ScrollReveal>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedWork.map((w, i) => (
                    <ScrollReveal key={i} delay={(i % 3) * 0.07}>
                      <div className="group overflow-hidden rounded-2xl bg-white/[0.03]">
                        {w.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.imageUrl}
                            alt={w.title}
                            className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="p-4">
                          {w.client && (
                            <div className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>
                              {w.client}
                            </div>
                          )}
                          <div className="text-[15px] font-semibold text-white">{w.title}</div>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tratamiento creativo ── */}
      {(p.treatmentHeading || treatmentParas.length > 0 || treatmentSections.length > 0 ||
        moodboard.length > 0 || references.length > 0) && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <SectionLabel accent={accent}>El tratamiento</SectionLabel>
              {p.treatmentHeading && (
                <h2
                  className="mb-8 max-w-3xl font-heading italic text-white"
                  style={{ fontSize: "clamp(28px,4vw,52px)", lineHeight: 1.02, letterSpacing: "-1px" }}
                >
                  {p.treatmentHeading}
                </h2>
              )}
            </ScrollReveal>

            {treatmentParas.length > 0 && (
              <ScrollReveal delay={0.05}>
                <div className="flex max-w-3xl flex-col gap-5">
                  {treatmentParas.map((para, i) => (
                    <p key={i} className="text-[16px] leading-relaxed text-white/80">
                      {para}
                    </p>
                  ))}
                </div>
              </ScrollReveal>
            )}

            {/* Secciones con imagen alternada */}
            {treatmentSections.length > 0 && (
              <div className="mt-14 flex flex-col gap-16">
                {treatmentSections.map((sec, i) => (
                  <ScrollReveal key={i}>
                    <div
                      className={`grid items-center gap-8 md:grid-cols-2 ${
                        i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                      }`}
                    >
                      {sec.imageUrl && (
                        <div className="overflow-hidden rounded-2xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sec.imageUrl}
                            alt={sec.heading}
                            className="aspect-[4/3] w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className={sec.imageUrl ? "" : "md:col-span-2 md:max-w-3xl"}>
                        <h3
                          className="mb-3 font-heading text-white"
                          style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.5px" }}
                        >
                          {sec.heading}
                        </h3>
                        {sec.body && (
                          <div className="flex flex-col gap-3">
                            {paragraphs(sec.body).map((para, j) => (
                              <p key={j} className="text-[15px] leading-relaxed text-white/75">
                                {para}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            )}

            {/* Moodboard */}
            {moodboard.length > 0 && (
              <div className="mt-16">
                <ScrollReveal>
                  <p className="mb-5 text-[12px] font-mono tracking-widest" style={{ color: accent }}>
                    {"// Moodboard"}
                  </p>
                </ScrollReveal>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {moodboard.map((m, i) => (
                    <ScrollReveal key={i} delay={(i % 4) * 0.05}>
                      <div className="overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt={m.alt ?? ""}
                          className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

            {/* Referencias */}
            {references.length > 0 && (
              <div className="mt-16">
                <ScrollReveal>
                  <p className="mb-5 text-[12px] font-mono tracking-widest" style={{ color: accent }}>
                    {"// Referencias"}
                  </p>
                </ScrollReveal>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {references.map((r, i) => {
                    const embed = refEmbed(r.url);
                    return (
                      <ScrollReveal key={i} delay={(i % 2) * 0.07}>
                        {embed ? (
                          <div className="overflow-hidden rounded-2xl">
                            <iframe
                              src={embed}
                              className="aspect-video w-full bg-black"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                              title={r.title}
                            />
                            {r.title && (
                              <div className="px-1 pt-3 text-[13px] text-white/65">{r.title}</div>
                            )}
                          </div>
                        ) : (
                          <a
                            href={safeHref(r.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="lg flex items-center justify-between rounded-2xl px-5 py-4 hover:bg-white/[0.07]"
                          >
                            <span className="text-[14px] text-white">{r.title || r.url}</span>
                            <ArrowUpRight />
                          </a>
                        )}
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Cronograma + entregables ── */}
      {(timeline.length > 0 || deliverables.length > 0) && (
        <section className="px-6 py-20" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2">
            {timeline.length > 0 && (
              <div>
                <ScrollReveal>
                  <SectionLabel accent={accent}>Cronograma</SectionLabel>
                  <h2
                    className="mb-8 font-heading text-white"
                    style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: "-1px" }}
                  >
                    Cómo lo haremos
                  </h2>
                </ScrollReveal>
                <div className="flex flex-col">
                  {timeline.map((t, i) => (
                    <ScrollReveal key={i} delay={i * 0.05}>
                      <div className="flex gap-4 pb-7">
                        <div className="flex flex-col items-center">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                            style={{ background: accent }}
                          >
                            {i + 1}
                          </div>
                          {i < timeline.length - 1 && (
                            <div className="mt-1 w-px flex-1 bg-white/12" />
                          )}
                        </div>
                        <div className="pb-1">
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            <span className="text-[16px] font-semibold text-white">{t.phase}</span>
                            {t.dateLabel && (
                              <span className="text-[12px] uppercase tracking-wider" style={{ color: accent }}>
                                {t.dateLabel}
                              </span>
                            )}
                          </div>
                          {t.desc && (
                            <p className="mt-1 text-[14px] leading-relaxed text-white/65">{t.desc}</p>
                          )}
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

            {deliverables.length > 0 && (
              <div>
                <ScrollReveal>
                  <SectionLabel accent={accent}>Entregables</SectionLabel>
                  <h2
                    className="mb-8 font-heading text-white"
                    style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: "-1px" }}
                  >
                    Qué recibes
                  </h2>
                </ScrollReveal>
                <div className="lg overflow-hidden rounded-2xl">
                  {deliverables.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0"
                    >
                      <span
                        className="text-[13px]"
                        style={{ color: accent }}
                        aria-hidden
                      >
                        ◆
                      </span>
                      <div className="flex-1">
                        <div className="text-[15px] font-medium text-white">{d.item}</div>
                        {d.detail && (
                          <div className="text-[13px] text-white/55">{d.detail}</div>
                        )}
                      </div>
                      {d.qty && (
                        <span className="text-[13px] font-mono text-white/55">×{d.qty}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Presupuesto ── */}
      {budgetItems.length > 0 && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <ScrollReveal>
              <SectionLabel accent={accent}>Inversión</SectionLabel>
              <h2
                className="mb-8 font-heading text-white"
                style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: "-1px" }}
              >
                Presupuesto
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="lg overflow-hidden rounded-2xl">
                {budget.lines.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 border-b border-white/5 px-5 py-4 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="text-[15px] font-medium text-white">{l.concept}</div>
                      {l.detail && <div className="text-[13px] text-white/55">{l.detail}</div>}
                    </div>
                    {p.showPrices && (
                      <div className="text-right">
                        <div className="text-[15px] font-medium text-white">
                          {formatMoney(l.lineTotal, p.currency)}
                        </div>
                        {l.qty && parseFloat(l.qty) !== 1 && (
                          <div className="text-[11px] text-white/45">
                            {l.qty} × {formatMoney(Number(l.unitPrice?.replace(/[^0-9]/g, "") || 0), p.currency)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {p.showPrices && (
                  <div className="bg-white/[0.03] px-5 py-5">
                    <div className="flex justify-between text-[13px] text-white/60">
                      <span>Subtotal</span>
                      <span>{formatMoney(budget.subtotal, p.currency)}</span>
                    </div>
                    {budget.taxRatePct > 0 && (
                      <div className="mt-1 flex justify-between text-[13px] text-white/60">
                        <span>IVA ({budget.taxRatePct}%)</span>
                        <span>{formatMoney(budget.taxAmount, p.currency)}</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
                      <span className="text-[14px] font-semibold uppercase tracking-wider text-white">
                        Total
                      </span>
                      <span
                        className="font-heading"
                        style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-1px", color: accent }}
                      >
                        {formatMoney(budget.total, p.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollReveal>

            {p.budgetNote && (
              <ScrollReveal delay={0.1}>
                <div className="mt-5 flex flex-col gap-2 text-[13px] leading-relaxed text-white/55">
                  {paragraphs(p.budgetNote).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </ScrollReveal>
            )}
          </div>
        </section>
      )}

      {/* ── Cierre ── */}
      <section className="px-6 py-24" style={{ background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2
              className="font-heading italic text-white"
              style={{ fontSize: "clamp(36px,5vw,64px)", lineHeight: 1.05, letterSpacing: "-1px" }}
            >
              {p.ctaHeading || "¿Avanzamos?"}
            </h2>
            {p.ctaBody &&
              paragraphs(p.ctaBody).map((para, i) => (
                <p key={i} className="mt-4 text-[16px] text-white/70">
                  {para}
                </p>
              ))}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={contactHref}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: accent }}
              >
                Aceptar y conversar <ArrowUpRight />
              </a>
              <Link
                href="/contacto"
                className="rounded-full border border-white/15 px-6 py-3 text-[14px] font-medium text-white/80 hover:bg-white/5"
              >
                Tengo preguntas
              </Link>
            </div>
            {p.validUntil && (
              <p className="mt-6 text-[12px] text-white/45">
                Esta propuesta es válida hasta el {dateFmt(p.validUntil)}.
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Footer mínimo */}
      <footer className="px-6 py-10" style={{ background: "var(--bg)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={0.85} />
          <p className="text-[12px] text-white/40">
            Propuesta confidencial preparada para {p.clientName}.
          </p>
        </div>
      </footer>
    </main>
  );
}

function SectionLabel({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em]"
      style={{ color: accent }}
    >
      {children}
    </div>
  );
}
