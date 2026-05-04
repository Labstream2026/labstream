import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireCmsUser,
  requirePageEditor,
  requireSuperAdmin,
  isSuperAdmin,
} from "@/lib/cms-guard";
import { PageStatus, Prisma } from "@prisma/client";
import {
  BLOCK_TYPES,
  BLOCK_LABELS,
  BLOCK_DESCRIPTIONS,
  BLOCK_DEFAULTS,
  isBlockType,
  type BlockType,
} from "@/lib/blocks";
import { BlockForm } from "@/components/cms/BlockForms";
import { ConfirmForm } from "@/components/ConfirmForm";

async function savePageMeta(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await requirePageEditor(id);
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDesc = String(formData.get("metaDesc") ?? "").trim() || null;
  const status = String(formData.get("status") ?? PageStatus.DRAFT) as PageStatus;

  await prisma.page.update({
    where: { id },
    data: {
      title,
      description,
      metaTitle,
      metaDesc,
      status,
      publishedAt:
        status === PageStatus.PUBLISHED
          ? page.publishedAt ?? new Date()
          : page.publishedAt,
      updatedById: me.id,
    },
  });

  revalidatePath("/");
  revalidatePath(`/cms/pages/${id}`);
  revalidatePath("/cms/pages");
}

async function deletePage(formData: FormData) {
  "use server";
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page || page.isHome) return;
  await prisma.page.delete({ where: { id } });
  revalidatePath("/cms/pages");
  revalidatePath("/");
  redirect("/cms/pages?ok=deleted");
}

async function saveBlock(formData: FormData) {
  "use server";
  const blockId = String(formData.get("blockId") ?? "");
  const block = await prisma.block.findUnique({ where: { id: blockId } });
  if (!block) return;
  const me = await requirePageEditor(block.pageId);

  const type = block.type as BlockType;
  let nextData: Record<string, unknown> = {};

  switch (type) {
    case "hero":
    case "richText":
    case "videoEmbed":
    case "cta":
    case "image": {
      for (const [k, v] of formData.entries()) {
        if (k === "blockId") continue;
        nextData[k] = String(v);
      }
      if (type === "image") nextData.fullWidth = formData.get("fullWidth") === "on";
      if (type === "hero") {
        const overlay = parseInt(String(formData.get("overlayOpacity") ?? "60"), 10);
        nextData.overlayOpacity = Number.isFinite(overlay)
          ? Math.min(Math.max(overlay, 0), 100)
          : 60;
      }
      break;
    }
    case "stats": {
      const items: { value: string; label: string }[] = [];
      for (let i = 0; i < 6; i++) {
        const value = String(formData.get(`item_${i}_value`) ?? "").trim();
        const label = String(formData.get(`item_${i}_label`) ?? "").trim();
        if (value && label) items.push({ value, label });
      }
      nextData = { items };
      break;
    }
    case "gallery": {
      const count = parseInt(String(formData.get("image_count") ?? "0"), 10);
      const images: { url: string; alt: string; caption: string }[] = [];
      for (let i = 0; i < count; i++) {
        const url = String(formData.get(`img_${i}_url`) ?? "").trim();
        if (!url) continue;
        images.push({
          url,
          alt: String(formData.get(`img_${i}_alt`) ?? "").trim(),
          caption: String(formData.get(`img_${i}_caption`) ?? "").trim(),
        });
      }
      const cols = parseInt(String(formData.get("columns") ?? "3"), 10);
      nextData = {
        eyebrow: String(formData.get("eyebrow") ?? ""),
        heading: String(formData.get("heading") ?? ""),
        images,
        columns: Number.isFinite(cols) ? Math.min(Math.max(cols, 1), 4) : 3,
      };
      break;
    }
    case "featureList": {
      const count = parseInt(String(formData.get("feat_count") ?? "0"), 10);
      const items: { icon: string; title: string; desc: string }[] = [];
      for (let i = 0; i < count; i++) {
        const title = String(formData.get(`feat_${i}_title`) ?? "").trim();
        if (!title) continue;
        items.push({
          icon: String(formData.get(`feat_${i}_icon`) ?? "").trim(),
          title,
          desc: String(formData.get(`feat_${i}_desc`) ?? "").trim(),
        });
      }
      const cols = parseInt(String(formData.get("columns") ?? "3"), 10);
      nextData = {
        eyebrow: String(formData.get("eyebrow") ?? ""),
        heading: String(formData.get("heading") ?? ""),
        items,
        columns: Number.isFinite(cols) ? Math.min(Math.max(cols, 1), 4) : 3,
      };
      break;
    }
    case "carousel": {
      const count = parseInt(String(formData.get("slide_count") ?? "0"), 10);
      const slides: { url: string; alt: string; caption: string; linkHref: string }[] = [];
      for (let i = 0; i < count; i++) {
        const url = String(formData.get(`slide_${i}_url`) ?? "").trim();
        if (!url) continue;
        slides.push({
          url,
          alt: String(formData.get(`slide_${i}_alt`) ?? "").trim(),
          caption: String(formData.get(`slide_${i}_caption`) ?? "").trim(),
          linkHref: String(formData.get(`slide_${i}_linkHref`) ?? "").trim(),
        });
      }
      const interval = parseInt(String(formData.get("intervalSeconds") ?? "5"), 10);
      nextData = {
        eyebrow: String(formData.get("eyebrow") ?? ""),
        heading: String(formData.get("heading") ?? ""),
        slides,
        autoplay: formData.get("autoplay") === "on",
        intervalSeconds: Number.isFinite(interval) ? Math.min(Math.max(interval, 2), 20) : 5,
        loop: formData.get("loop") === "on",
        indicators: formData.get("indicators") === "on",
        aspectRatio: String(formData.get("aspectRatio") ?? "16/9"),
      };
      break;
    }
  }

  await prisma.block.update({
    where: { id: blockId },
    data: { data: nextData as Prisma.InputJsonValue, updatedById: me.id },
  });

  revalidatePath("/");
  revalidatePath(`/cms/pages/${block.pageId}`);
}

async function addBlock(formData: FormData) {
  "use server";
  const pageId = String(formData.get("pageId") ?? "");
  const me = await requirePageEditor(pageId);
  const type = String(formData.get("type") ?? "");
  if (!isBlockType(type)) return;

  const lastBlock = await prisma.block.findFirst({
    where: { pageId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.block.create({
    data: {
      pageId,
      type,
      order: (lastBlock?.order ?? -1) + 1,
      data: BLOCK_DEFAULTS[type] as Prisma.InputJsonValue,
      updatedById: me.id,
    },
  });

  revalidatePath("/");
  revalidatePath(`/cms/pages/${pageId}`);
}

async function deleteBlock(formData: FormData) {
  "use server";
  const blockId = String(formData.get("blockId") ?? "");
  const block = await prisma.block.findUnique({ where: { id: blockId } });
  if (!block) return;
  await requirePageEditor(block.pageId);
  await prisma.block.delete({ where: { id: blockId } });
  revalidatePath("/");
  revalidatePath(`/cms/pages/${block.pageId}`);
}

async function moveBlock(blockId: string, direction: -1 | 1) {
  const block = await prisma.block.findUnique({ where: { id: blockId } });
  if (!block) return;
  await requirePageEditor(block.pageId);

  const neighbor = await prisma.block.findFirst({
    where: {
      pageId: block.pageId,
      order: direction === -1 ? { lt: block.order } : { gt: block.order },
    },
    orderBy: { order: direction === -1 ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.block.update({
      where: { id: block.id },
      data: { order: neighbor.order },
    }),
    prisma.block.update({
      where: { id: neighbor.id },
      data: { order: block.order },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/cms/pages/${block.pageId}`);
}

async function moveBlockUp(formData: FormData) {
  "use server";
  await moveBlock(String(formData.get("blockId") ?? ""), -1);
}

async function moveBlockDown(formData: FormData) {
  "use server";
  await moveBlock(String(formData.get("blockId") ?? ""), 1);
}

export default async function EditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireCmsUser();
  const { id } = await props.params;

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { order: "asc" } },
      assignments: { include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!page) notFound();

  // For editors, ensure access
  await requirePageEditor(id);

  const isSuper = isSuperAdmin(me.role);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6 flex items-center gap-3 text-[13px] text-white/45">
        <Link href="/cms/pages" className="hover:text-white">
          Páginas
        </Link>
        <span>/</span>
        <span className="text-white/85">{page.title}</span>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1
          className="font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {page.title}
        </h1>
        <div className="flex items-center gap-2">
          {isSuper && (
            <Link
              href={`/cms/pages/${page.id}/assignments`}
              className="btn-ghost"
            >
              Asignar editores ({page.assignments.length})
            </Link>
          )}
          <Link
            href={page.isHome ? "/" : `/${page.slug}`}
            target="_blank"
            className="btn-ghost"
          >
            Ver pública ↗
          </Link>
        </div>
      </div>

      <div
        className="mb-6 rounded-2xl border p-4"
        style={{
          borderColor: "rgba(232,100,12,0.35)",
          background: "linear-gradient(180deg, rgba(232,100,12,0.06), transparent 80%)",
        }}
      >
        <div className="text-[12px] font-semibold uppercase tracking-wider text-orange">
          💡 Cómo subir y cambiar imágenes / videos
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-white/75">
          <li>
            • <strong>Hero</strong>: ahora tiene campos &quot;Imagen de fondo&quot; y
            &quot;Video de fondo&quot;. Click en el botón naranja{" "}
            <span className="rounded border border-orange/40 bg-orange/10 px-1.5 py-0.5 text-[11px] text-orange">
              + Elegir imagen
            </span>{" "}
            para abrir la biblioteca o subir nueva.
          </li>
          <li>
            • <strong>Galería / Carrusel / Imagen</strong>: agrega un bloque de ese tipo
            abajo y usa el mismo botón. Soporta múltiple selección.
          </li>
          <li>
            • <strong>Video</strong>: pega URL de YouTube, Vimeo, Drive o .mp4 — la app
            detecta el tipo automáticamente.
          </li>
          <li>
            • <strong>Reemplazar</strong>: edita el bloque, click en el thumbnail
            existente o &quot;Cambiar imagen&quot; → elige otra → guarda.
          </li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <form
            action={savePageMeta}
            className="lg flex flex-col gap-4 rounded-2xl p-6"
          >
            <input type="hidden" name="id" value={page.id} />
            <h2 className="mb-1 text-[14px] font-semibold text-white">
              Información de la página
            </h2>

            <Field name="title" label="Título" defaultValue={page.title} />
            <Field
              name="description"
              label="Descripción interna"
              defaultValue={page.description ?? ""}
            />
            <Field
              name="metaTitle"
              label="Meta título (SEO)"
              defaultValue={page.metaTitle ?? ""}
            />
            <Field
              name="metaDesc"
              label="Meta descripción (SEO)"
              defaultValue={page.metaDesc ?? ""}
              multiline
            />

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Estado
              </span>
              <select
                name="status"
                defaultValue={page.status}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
              >
                <option value={PageStatus.DRAFT}>Borrador</option>
                <option value={PageStatus.REVIEW}>En revisión</option>
                <option value={PageStatus.PUBLISHED}>Publicado</option>
              </select>
            </label>

            <button type="submit" className="btn-primary mt-2 self-start">
              Guardar
            </button>
          </form>

          {isSuper && !page.isHome && (
            <ConfirmForm
              action={deletePage}
              className="mt-6 lg rounded-2xl p-6"
              message={`¿Eliminar la página "${page.title}"? Esta acción no se puede deshacer.`}
            >
              <input type="hidden" name="id" value={page.id} />
              <h2 className="mb-2 text-[14px] font-semibold text-red-300">
                Zona peligrosa
              </h2>
              <p className="mb-3 text-[12px] text-white/55">
                Eliminar esta página borrará también todos sus bloques.
              </p>
              <button
                type="submit"
                className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] font-medium text-red-300 hover:bg-red-500/20"
              >
                Eliminar página
              </button>
            </ConfirmForm>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-white">
              Bloques de contenido ({page.blocks.length})
            </h2>
          </div>

          {page.blocks.map((b, idx) => (
            <div key={b.id} className="lg rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange">
                  {BLOCK_LABELS[b.type as BlockType] ?? b.type}
                </span>
                <span className="text-[11px] text-white/40">
                  Posición {idx + 1} / {page.blocks.length}
                </span>
              </div>
              <BlockForm
                type={b.type as BlockType}
                blockId={b.id}
                data={b.data as Record<string, unknown>}
                saveAction={saveBlock}
                deleteAction={deleteBlock}
                moveUpAction={moveBlockUp}
                moveDownAction={moveBlockDown}
              />
            </div>
          ))}

          {page.blocks.length === 0 && (
            <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
              Esta página aún no tiene bloques. Agrega uno abajo.
            </div>
          )}

          <div className="lg rounded-2xl p-6">
            <h3 className="mb-1 text-[14px] font-semibold text-white">
              Agregar bloque
            </h3>
            <p className="mb-4 text-[12px] text-white/55">
              Elige el tipo y se agrega al final de la página.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BLOCK_TYPES.map((t) => (
                <form key={t} action={addBlock}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <input type="hidden" name="type" value={t} />
                  <button
                    type="submit"
                    className="flex w-full flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-orange/40 hover:bg-white/5"
                  >
                    <span className="text-[14px] font-semibold text-white">
                      + {BLOCK_LABELS[t]}
                    </span>
                    <span className="text-[12px] text-white/55">
                      {BLOCK_DESCRIPTIONS[t]}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  multiline,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={3}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
        />
      )}
    </label>
  );
}
