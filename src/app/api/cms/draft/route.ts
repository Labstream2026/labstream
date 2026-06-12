import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCms, canEditPages } from "@/lib/cms-guard";
import {
  COLLECTION_SURFACES,
  CONFIG_SURFACES,
  type PreviewModel,
  type CollectionSurface,
  type ConfigSurface,
} from "@/lib/preview";

const MAX_DRAFT_BYTES = 200 * 1024; // 200 KB tope por draft

// Registros únicos: el borrador vive en la columna `draft` del propio registro.
const RECORD_MODELS: PreviewModel[] = [
  "portfolio",
  "blog",
  "service",
  "about",
  "home",
];

function isRecordModel(m: string): m is PreviewModel {
  return (RECORD_MODELS as string[]).includes(m);
}
function isCollectionSurface(m: string): m is CollectionSurface {
  return (COLLECTION_SURFACES as string[]).includes(m);
}
function isConfigSurface(m: string): m is ConfigSurface {
  return (CONFIG_SURFACES as string[]).includes(m);
}

function recordDelegate(model: PreviewModel) {
  switch (model) {
    case "portfolio":
      return prisma.portfolioProject;
    case "blog":
      return prisma.blogPost;
    case "service":
      return prisma.service;
    case "about":
      return prisma.aboutContent;
    case "home":
      return prisma.homeContent;
  }
}

async function requireEditor() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.active === false) return null;
  if (!canAccessCms(session.user.kind)) return null;
  // Solo editores escriben drafts; REVIEWER es de solo lectura.
  if (!canEditPages(session.user.role)) return null;
  return session.user;
}

/** Tamaño serializado dentro del límite. */
function withinSize(data: unknown): boolean {
  try {
    return JSON.stringify(data).length <= MAX_DRAFT_BYTES;
  } catch {
    return false;
  }
}

/** ¿Objeto JSON plano (no array, no null)? */
function isPlainObject(data: unknown): data is Record<string, unknown> {
  return Boolean(data) && typeof data === "object" && !Array.isArray(data);
}

export async function POST(req: Request) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { model?: string; id?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { model, id, data } = body;
  if (!model || typeof model !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_model" }, { status: 400 });
  }
  if (!isPlainObject(data) || !withinSize(data)) {
    return NextResponse.json({ ok: false, error: "invalid_data" }, { status: 400 });
  }

  try {
    if (isRecordModel(model)) {
      if (!id || typeof id !== "string") {
        return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
      }
      const delegate = recordDelegate(model);
      // @ts-expect-error — la unión de delegates tiene un update compatible
      await delegate.update({
        where: { id },
        data: { draft: data as Prisma.InputJsonValue },
      });
    } else if (isCollectionSurface(model)) {
      const items = (data as { items?: unknown }).items;
      if (!Array.isArray(items)) {
        return NextResponse.json({ ok: false, error: "invalid_data" }, { status: 400 });
      }
      await prisma.previewDraft.upsert({
        where: { key: model },
        update: { data: data as Prisma.InputJsonValue },
        create: { key: model, data: data as Prisma.InputJsonValue },
      });
    } else if (isConfigSurface(model)) {
      // Apariencia y ajustes comparten SiteSettings.draft; fusionamos para que
      // editar una no borre el borrador de la otra.
      const existing = await prisma.siteSettings.findUnique({
        where: { id: "singleton" },
        select: { draft: true },
      });
      const prev = isPlainObject(existing?.draft) ? existing!.draft : {};
      const merged = { ...prev, ...(data as Record<string, unknown>) };
      await prisma.siteSettings.upsert({
        where: { id: "singleton" },
        update: { draft: merged as Prisma.InputJsonValue },
        create: { id: "singleton", draft: merged as Prisma.InputJsonValue },
      });
    } else {
      return NextResponse.json({ ok: false, error: "invalid_model" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const model = url.searchParams.get("model") ?? "";
  const id = url.searchParams.get("id") ?? "";

  try {
    if (isRecordModel(model)) {
      if (!id) {
        return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
      }
      const delegate = recordDelegate(model);
      // @ts-expect-error — la unión de delegates tiene un update compatible
      await delegate.update({
        where: { id },
        data: { draft: Prisma.JsonNull },
      });
    } else if (isCollectionSurface(model)) {
      await prisma.previewDraft.deleteMany({ where: { key: model } });
    } else if (isConfigSurface(model)) {
      await prisma.siteSettings.update({
        where: { id: "singleton" },
        data: { draft: Prisma.JsonNull },
      });
    } else {
      return NextResponse.json({ ok: false, error: "invalid_model" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "clear_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
