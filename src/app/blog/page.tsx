import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus } from "@prisma/client";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ScrollReveal } from "@/components/public/ScrollReveal";

export const metadata = {
  title: "Blog",
  description: "Guías, casos de estudio y reflexiones sobre producción audiovisual e IA aplicada.",
};

export default async function BlogPage(props: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await props.searchParams;
  const activeCategory = sp.cat;

  const posts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.PUBLISHED,
      ...(activeCategory ? { category: activeCategory } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });

  const allCategoriesData = await prisma.blogPost.findMany({
    where: { status: BlogPostStatus.PUBLISHED },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = allCategoriesData
    .map((p) => p.category)
    .filter((c): c is string => Boolean(c));

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      <section className="relative overflow-hidden pb-12 pt-32 md:pt-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=2400&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,8,0.65) 0%, rgba(8,8,8,0.88) 60%, rgba(8,8,8,1) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              // Blog
            </p>
            <h1
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(48px,8vw,120px)",
                lineHeight: 0.92,
                letterSpacing: "-2px",
                maxWidth: "12ch",
              }}
            >
              Notas de campo
            </h1>
            <p className="mt-7 max-w-2xl text-[16px] font-light text-white/75">
              Lo que aprendemos haciendo producción audiovisual. Sin hype, con
              ejemplos.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="px-6 py-6" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  !activeCategory
                    ? "border-orange/40 bg-orange/10 text-orange"
                    : "border-white/10 text-white/65 hover:bg-white/5"
                }`}
              >
                Todos
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/blog?cat=${encodeURIComponent(c)}`}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                    activeCategory === c
                      ? "border-orange/40 bg-orange/10 text-orange"
                      : "border-white/10 text-white/65 hover:bg-white/5"
                  }`}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      {featured && (
        <section className="px-6 py-8" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid gap-8 overflow-hidden rounded-3xl border border-white/5 md:grid-cols-2"
              >
                {featured.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.coverImageUrl}
                    alt={featured.title}
                    className="aspect-video h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 md:aspect-auto"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
                  <p className="text-[11px] uppercase tracking-widest text-orange">
                    Destacado · {featured.category}
                  </p>
                  <h2
                    className="font-heading italic text-white"
                    style={{ fontSize: "clamp(28px,3.5vw,44px)", lineHeight: 1.1 }}
                  >
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-[15px] font-light text-white/70">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="text-[12px] text-white/45">
                    {featured.authorName} · {featured.readMinutes ?? 5} min de lectura
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <section className="px-6 py-12" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <ScrollReveal key={post.id} delay={(i % 3) * 0.07}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all hover:-translate-y-1 hover:border-white/15"
                  >
                    {post.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      {post.category && (
                        <p className="mb-2 text-[10px] uppercase tracking-widest text-orange">
                          {post.category}
                        </p>
                      )}
                      <h3 className="mb-2 text-[17px] font-semibold leading-snug text-white">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-[13px] leading-relaxed text-white/60 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-auto pt-3 text-[11px] text-white/40">
                        {post.authorName} · {post.readMinutes ?? 5} min
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {posts.length === 0 && (
        <div className="px-6 py-24 text-center text-[14px] text-white/55">
          Aún no hay posts publicados.
        </div>
      )}

      <Footer />
    </main>
  );
}
