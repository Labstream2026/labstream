import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus } from "@prisma/client";
import { isPreviewMode, mergeDraft } from "@/lib/preview";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight } from "@/components/Icons";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const p = await prisma.blogPost.findUnique({ where: { slug } });
  if (!p) return { title: "Post no encontrado" };
  return {
    title: p.title,
    description: p.excerpt ?? undefined,
    openGraph: { images: p.coverImageUrl ? [p.coverImageUrl] : [] },
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Solo permite http(s), mailto y rutas internas; neutraliza javascript:, data:, etc. */
function safeHref(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|\/)/i.test(trimmed)) return trimmed;
  return "#";
}

function renderInline(s: string) {
  let out = escapeHtml(s);
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text: string, url: string) =>
      `<a href="${safeHref(url)}" class="text-orange underline-offset-4 hover:underline" target="_blank" rel="noreferrer">${text}</a>`,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] font-mono">$1</code>',
  );
  return out;
}

function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const blocks: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    blocks.push(
      `<p class="mb-6 text-[16px] leading-[1.8] text-white/80">${renderInline(para.join(" "))}</p>`,
    );
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }

    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      flushPara();
      blocks.push(
        `<h2 class="mb-4 mt-12 font-heading italic text-white" style="font-size:32px;line-height:1.15;">${renderInline(h2[1])}</h2>`,
      );
      i++;
      continue;
    }

    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1) {
      flushPara();
      blocks.push(
        `<h1 class="mb-4 mt-12 font-heading italic text-white" style="font-size:40px;line-height:1.1;">${renderInline(h1[1])}</h1>`,
      );
      i++;
      continue;
    }

    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      flushPara();
      blocks.push(
        `<h3 class="mb-3 mt-8 text-[20px] font-semibold text-white">${renderInline(h3[1])}</h3>`,
      );
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+(.+)$/.test(lines[i])) {
        const m = /^\s*[-*]\s+(.+)$/.exec(lines[i]);
        if (m) items.push(`<li class="mb-2">${renderInline(m[1])}</li>`);
        i++;
      }
      blocks.push(
        `<ul class="mb-6 ml-6 list-disc text-[16px] leading-[1.8] text-white/80 marker:text-orange">${items.join("")}</ul>`,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+(.+)$/.test(lines[i])) {
        const m = /^\s*\d+\.\s+(.+)$/.exec(lines[i]);
        if (m) items.push(`<li class="mb-2">${renderInline(m[1])}</li>`);
        i++;
      }
      blocks.push(
        `<ol class="mb-6 ml-6 list-decimal text-[16px] leading-[1.8] text-white/80 marker:text-orange">${items.join("")}</ol>`,
      );
      continue;
    }

    if (/^>\s+/.test(line)) {
      flushPara();
      const m = /^>\s+(.+)$/.exec(line);
      if (m) {
        blocks.push(
          `<blockquote class="my-8 border-l-2 border-orange/50 pl-6 font-heading italic text-white/85" style="font-size:22px;line-height:1.4;">${renderInline(m[1])}</blockquote>`,
        );
      }
      i++;
      continue;
    }

    para.push(line);
    i++;
  }

  flushPara();
  return blocks.join("\n");
}

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const preview = await isPreviewMode(sp);
  const found = await prisma.blogPost.findUnique({ where: { slug } });
  if (!found) notFound();
  if (!preview && found.status !== BlogPostStatus.PUBLISHED) notFound();
  const post = preview ? mergeDraft(found, found.draft) : found;

  const related = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.PUBLISHED,
      id: { not: post.id },
      ...(post.category ? { category: post.category } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const html = renderMarkdown(post.content);

  const dateText = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      {/* Hero */}
      <section className="px-6 pb-10 pt-32 md:pt-40" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <Link
              href="/blog"
              className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-orange"
            >
              ← Volver al blog
            </Link>
            {post.category && (
              <p className="mb-3 text-[11px] font-mono uppercase tracking-widest text-orange">
                {"// "}{post.category}
              </p>
            )}
            <h1
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(36px,6vw,72px)",
                lineHeight: 1.02,
                letterSpacing: "-1px",
              }}
            >
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-6 text-[18px] font-light leading-relaxed text-white/75">
                {post.excerpt}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4 text-[12px] text-white/55">
              {post.authorName && (
                <span>
                  Por <span className="text-white/80">{post.authorName}</span>
                  {post.authorRole ? ` · ${post.authorRole}` : ""}
                </span>
              )}
              {dateText && <span>· {dateText}</span>}
              <span>· {post.readMinutes ?? 5} min de lectura</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Cover image */}
      {post.coverImageUrl && (
        <section className="px-6 pb-12" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-5xl">
            <ScrollReveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="aspect-video w-full rounded-3xl object-cover"
                referrerPolicy="no-referrer"
              />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Body */}
      <section className="px-6 py-12" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <article dangerouslySetInnerHTML={{ __html: html }} />
          </ScrollReveal>

          {post.tags.length > 0 && (
            <div className="mt-14 flex flex-wrap gap-2 border-t border-white/10 pt-8">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Author bio */}
      {post.authorName && (
        <section className="px-6 py-12" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-3xl">
            <ScrollReveal>
              <div className="lg flex items-center gap-5 rounded-2xl p-6">
                <div
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full font-heading italic text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--orange), var(--orange-2))",
                    fontSize: 24,
                  }}
                >
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">
                    {post.authorName}
                  </p>
                  {post.authorRole && (
                    <p className="text-[13px] text-white/60">{post.authorRole}</p>
                  )}
                  <p className="mt-1 text-[12px] text-white/45">
                    Equipo Labstream Studio
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="px-6 py-16" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Sigue leyendo"}
              </p>
              <h2
                className="mb-10 font-heading text-white"
                style={{ fontSize: 32, lineHeight: 1.05 }}
              >
                Posts relacionados
              </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {related.map((r, i) => (
                <ScrollReveal key={r.id} delay={i * 0.07}>
                  <Link
                    href={`/blog/${r.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all hover:-translate-y-1 hover:border-white/15"
                  >
                    {r.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.coverImageUrl}
                        alt={r.title}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      {r.category && (
                        <p className="mb-2 text-[10px] uppercase tracking-widest text-orange">
                          {r.category}
                        </p>
                      )}
                      <h3 className="mb-2 text-[16px] font-semibold leading-snug text-white">
                        {r.title}
                      </h3>
                      {r.excerpt && (
                        <p className="text-[13px] leading-relaxed text-white/55 line-clamp-3">
                          {r.excerpt}
                        </p>
                      )}
                      <div className="mt-auto pt-3 text-[11px] text-white/40">
                        {r.readMinutes ?? 5} min
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-20" style={{ background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              {"// ¿Tienes un proyecto?"}
            </p>
            <h2
              className="mb-6 font-heading italic text-white"
              style={{ fontSize: "clamp(32px,5vw,56px)", lineHeight: 1.05 }}
            >
              Hablemos de cómo aplicarlo
            </h2>
            <p className="mb-8 text-[15px] font-light text-white/70">
              La primera conversación es gratis. Te dejamos un brief con criterio
              independiente — útil aunque no trabajes con nosotros.
            </p>
            <Link href="/contacto" className="btn-primary inline-flex">
              Cuéntanos tu proyecto <ArrowUpRight />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
