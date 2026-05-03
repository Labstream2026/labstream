import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  listFolder,
  classifyFolder,
  makeSnapshot,
  diffSnapshots,
  type DriveSnapshot,
} from "@/lib/google-drive";
import { canViewProject } from "@/lib/app-guards";

/**
 * GET /api/drive/folder?versionId=xxx
 *
 * Devuelve los archivos de la carpeta de Drive asociada a la version.
 * También guarda un snapshot para detectar cambios después.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const versionId = url.searchParams.get("versionId");
  if (!versionId) {
    return NextResponse.json({ ok: false, error: "no_version" }, { status: 400 });
  }

  const version = await prisma.deliverableVersion.findUnique({
    where: { id: versionId },
    include: { deliverable: true },
  });
  if (!version) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const ok = await canViewProject(
    session.user.id,
    session.user.role,
    version.deliverable.projectId,
  );
  if (!ok) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (!version.driveFolderId) {
    return NextResponse.json({
      ok: false,
      error: "not_a_folder",
      embedKind: version.embedKind,
    });
  }

  const listing = await listFolder(version.driveFolderId);

  // Guardar snapshot en BD
  const snapshot = makeSnapshot(listing.files);
  const previousSnapshot = version.driveSnapshotJson as unknown as
    | DriveSnapshot
    | null;
  const diff = diffSnapshots(previousSnapshot, snapshot);

  await prisma.deliverableVersion.update({
    where: { id: version.id },
    data: {
      driveLastCheckedAt: listing.fetchedAt,
      driveFileCount: listing.files.length,
      driveSnapshotJson: snapshot as unknown as object,
      embedKind: listing.files.length > 0 ? classifyFolder(listing.files) : version.embedKind,
    },
  });

  return NextResponse.json({
    ok: true,
    files: listing.files,
    fetchedAt: listing.fetchedAt.toISOString(),
    source: listing.source,
    error: listing.error,
    diff: previousSnapshot ? diff : null,
    classifyAs: classifyFolder(listing.files),
  });
}
