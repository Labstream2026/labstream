import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCms } from "@/lib/cms-guard";

export type CommandRecord = {
  kind: "portfolio" | "blog" | "service" | "team" | "testimonial" | "lead";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

/**
 * Returns recent editable records across all CMS models, optionally filtered
 * by a search query. Used by the command palette.
 *
 * Query params:
 *   q       — search query (matches title/name/slug/email per model)
 *   limit   — max items per kind (default 5, capped at 20)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccessCms(session.user.kind)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    20,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10) || 5),
  );

  const ci = { mode: "insensitive" as const };

  const [portfolio, blog, services, team, testimonials, leads] = await Promise.all([
    prisma.portfolioProject.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q, ...ci } },
              { slug: { contains: q, ...ci } },
              { client: { contains: q, ...ci } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, title: true, slug: true, client: true },
    }),
    prisma.blogPost.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q, ...ci } },
              { slug: { contains: q, ...ci } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, title: true, slug: true, status: true },
    }),
    prisma.service.findMany({
      where: q
        ? { title: { contains: q, ...ci } }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, title: true, slug: true },
    }),
    prisma.teamMember.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, ...ci } },
              { role: { contains: q, ...ci } },
            ],
          }
        : undefined,
      orderBy: { order: "asc" },
      take: limit,
      select: { id: true, name: true, role: true },
    }),
    prisma.testimonial.findMany({
      where: q
        ? {
            OR: [
              { authorName: { contains: q, ...ci } },
              { authorCompany: { contains: q, ...ci } },
            ],
          }
        : undefined,
      orderBy: { order: "asc" },
      take: limit,
      select: { id: true, authorName: true, authorCompany: true },
    }),
    prisma.lead.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, ...ci } },
              { email: { contains: q, ...ci } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, email: true, status: true },
    }),
  ]);

  const results: CommandRecord[] = [
    ...portfolio.map((p) => ({
      kind: "portfolio" as const,
      id: p.id,
      title: p.title,
      subtitle: p.client ?? `/${p.slug}`,
      href: `/cms/portfolio/${p.id}`,
    })),
    ...blog.map((b) => ({
      kind: "blog" as const,
      id: b.id,
      title: b.title,
      subtitle: b.status === "PUBLISHED" ? "Publicado" : "Borrador",
      href: `/cms/blog/${b.id}`,
    })),
    ...services.map((s) => ({
      kind: "service" as const,
      id: s.id,
      title: s.title,
      subtitle: `/${s.slug}`,
      href: `/cms/services/${s.id}`,
    })),
    ...team.map((t) => ({
      kind: "team" as const,
      id: t.id,
      title: t.name,
      subtitle: t.role,
      href: "/cms/team",
    })),
    ...testimonials.map((t) => ({
      kind: "testimonial" as const,
      id: t.id,
      title: t.authorName,
      subtitle: t.authorCompany ?? undefined,
      href: "/cms/testimonials",
    })),
    ...leads.map((l) => ({
      kind: "lead" as const,
      id: l.id,
      title: l.name,
      subtitle: `${l.email} · ${l.status}`,
      href: `/cms/leads/${l.id}`,
    })),
  ];

  return NextResponse.json({ ok: true, results });
}
