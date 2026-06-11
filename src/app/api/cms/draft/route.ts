import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCms, canEditPages } from "@/lib/cms-guard";
import type { PreviewModel } from "@/lib/preview";

const MAX_DRAFT_BYTES = 200 * 1024; // 200 KB tope por draft

const VALID_MODELS: PreviewModel[] = ["portfolio", "blog", "service", "about"];

function modelDelegate(model: PreviewModel) {
  switch (model) {
    case "portfolio":
      return prisma.portfolioProject;
    case "blog":
      return prisma.blogPost;
    case "service":
      return prisma.service;
    case "about":
      return prisma.aboutContent;
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

/** ¿Es un objeto JSON plano (no array, no null) dentro del límite de tamaño? */
function isValidDraftData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  try {
    return JSON.stringify(data).length <= MAX_DRAFT_BYTES;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const user = await requireEditor();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { model?: string; id?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { model, id, data } = body;
  if (!model || !VALID_MODELS.includes(model as PreviewModel)) {
    return NextResponse.json({ ok: false, error: "invalid_model" }, { status: 400 });
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }
  if (!isValidDraftData(data)) {
    return NextResponse.json({ ok: false, error: "invalid_data" }, { status: 400 });
  }

  const delegate = modelDelegate(model as PreviewModel);
  try {
    // @ts-expect-error — delegate union has a compatible update shape
    await delegate.update({
      where: { id },
      data: { draft: data as Prisma.InputJsonValue },
    });
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

  if (!VALID_MODELS.includes(model as PreviewModel)) {
    return NextResponse.json({ ok: false, error: "invalid_model" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const delegate = modelDelegate(model as PreviewModel);
  try {
    // @ts-expect-error — delegate union has a compatible update shape
    await delegate.update({
      where: { id },
      data: { draft: Prisma.JsonNull },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "clear_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
