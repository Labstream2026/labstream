import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isReviewLinkActive, resolvePlayer } from "@/lib/review";
import {
  ReviewPlayer,
  type ReviewComment,
  type PlayerSrc,
} from "@/components/review/ReviewPlayer";
import { hasDriveCredentials } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const link = await prisma.reviewLink.findUnique({
    where: { slug },
    select: { title: true, version: { select: { deliverable: { select: { title: true, project: { select: { name: true } } } } } } },
  });
  if (!link) return { title: "Revisión" };
  const t =
    link.title ??
    `${link.version.deliverable.title} — ${link.version.deliverable.project.name}`;
  return {
    title: `${t} — Revisión`,
    robots: { index: false, follow: false },
  };
}

export default async function ReviewPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const link = await prisma.reviewLink.findUnique({
    where: { slug },
    include: {
      version: {
        include: {
          deliverable: {
            include: { project: { select: { name: true } } },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, email: true } },
              frameAsset: { select: { id: true, url: true } },
            },
          },
        },
      },
    },
  });

  if (!link) notFound();

  const active = isReviewLinkActive(link);
  if (!active.active) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-white" style={{ fontSize: 36 }}>
            {active.reason === "expired" ? "Link expirado" : "Link revocado"}
          </h1>
          <p className="mt-3 text-[14px] text-white/65">
            Pídele al productor que te genere uno nuevo.
          </p>
        </div>
      </main>
    );
  }

  const session = await auth();

  // Lee perfil global del invitado (usado tanto para visit tracking como para
  // saltarse el welcome gate en links subsiguientes).
  const cookieStore = await cookies();
  const headersList = await headers();
  const guestCookie = cookieStore.get("lab_guest");
  let initialGuestName: string | null = null;
  let initialGuestEmail: string | null = null;
  if (guestCookie) {
    try {
      const v = JSON.parse(decodeURIComponent(guestCookie.value));
      initialGuestName = typeof v.name === "string" ? v.name : null;
      initialGuestEmail = typeof v.email === "string" ? v.email : null;
    } catch {}
  }

  // Registra visita (best-effort, fire & forget)
  void prisma.reviewVisit
    .create({
      data: {
        reviewLinkId: link.id,
        guestName: initialGuestName,
        guestEmail: initialGuestEmail,
        userId: session?.user?.id ?? null,
        userAgent: headersList.get("user-agent")?.slice(0, 200) ?? null,
      },
    })
    .catch((e) => console.warn("[review] visit tracking failed", e));

  // Player mode: si Drive y hay credenciales para proxy, usar streaming directo
  const drive = hasDriveCredentials();
  const canProxyDrive = drive.apiKey || drive.serviceAccount;

  const playerMode = resolvePlayer(link.version, {
    reviewSlug: slug,
    forceProxy: canProxyDrive,
  });

  const player: PlayerSrc =
    playerMode.kind === "video"
      ? { kind: "video", src: playerMode.src }
      : playerMode.kind === "iframe"
      ? { kind: "iframe", src: playerMode.src }
      : playerMode.kind === "image"
      ? { kind: "image", src: playerMode.src }
      : { kind: "unsupported", url: playerMode.url ?? "" };

  const initialComments: ReviewComment[] = link.version.comments.map((c) => ({
    id: c.id,
    body: c.body,
    videoTimeMs: c.videoTimeMs,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    resolved: c.resolved,
    isGuest: !c.authorId,
    displayName: c.author
      ? c.author.name ?? c.author.email
      : c.guestName ?? "Invitado",
    annotations: (c.annotationsJson as unknown as ReviewComment["annotations"]) ?? null,
    frame: c.frameAsset ? { id: c.frameAsset.id, url: c.frameAsset.url } : null,
  }));

  const title =
    link.title ??
    `${link.version.deliverable.title} — v${link.version.versionNumber}`;

  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-8">
      {/* Header simple sin sidebar/CMS */}
      <header className="mx-auto mb-5 flex max-w-[1400px] items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-orange">
            {"// Revisión cliente"}
          </div>
          <div className="mt-0.5 text-[12.5px] text-white/55">
            {link.version.deliverable.project.name} · v{link.version.versionNumber}
          </div>
        </div>
        <div className="text-[11px] text-white/40">
          {session?.user
            ? `Logueado como ${session.user.name ?? session.user.email}`
            : link.allowGuests
            ? "Acceso abierto · usa tu nombre para comentar"
            : "Este link requiere login"}
        </div>
      </header>

      <div className="mx-auto max-w-[1400px]">
        <ReviewPlayer
          slug={slug}
          title={title}
          message={link.message}
          player={player}
          initialComments={initialComments}
          guestName={initialGuestName}
          guestEmail={initialGuestEmail}
          isLoggedIn={Boolean(session?.user)}
          loggedInName={session?.user?.name ?? session?.user?.email ?? null}
          allowGuests={link.allowGuests}
          allowDrawings={link.allowDrawings}
          requireGuestEmail={link.requireGuestEmail}
          canResolve={Boolean(session?.user)}
        />
      </div>
    </main>
  );
}
