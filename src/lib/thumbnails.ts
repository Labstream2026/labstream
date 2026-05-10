import { EmbedKind } from "@prisma/client";
import {
  driveImageThumbnailUrl,
  extractVimeoId,
  extractYouTubeId,
} from "@/lib/google-drive";

type VersionLike = {
  externalUrl: string | null;
  embedKind: EmbedKind;
  driveFileId: string | null;
  driveFolderId: string | null;
  driveSnapshotJson: unknown;
};

/**
 * Devuelve la URL de un thumbnail para un entregable, derivando del tipo de embed.
 *   - DRIVE_FILE: Google thumbnail
 *   - DRIVE_FOLDER_*: primera foto del snapshot (si existe)
 *   - YOUTUBE: img.youtube.com
 *   - VIMEO: thumbnail vía vumbnail.com (gratuito, sin auth)
 *   - DIRECT_VIDEO / IMAGE: la propia URL
 *   - default: null → el caller pinta un placeholder
 */
export function thumbnailFromVersion(v: VersionLike | null | undefined): string | null {
  if (!v) return null;

  if (v.driveFileId && v.embedKind === EmbedKind.DRIVE_FILE) {
    return driveImageThumbnailUrl(v.driveFileId, 480);
  }

  if (
    v.driveFolderId &&
    (v.embedKind === EmbedKind.DRIVE_FOLDER_PHOTOS ||
      v.embedKind === EmbedKind.DRIVE_FOLDER_VIDEOS ||
      v.embedKind === EmbedKind.DRIVE_FOLDER_MIXED)
  ) {
    // Saca el primer file del snapshot guardado al chequear la carpeta
    type SnapItem = { id?: string };
    type Snap = { ids?: string[]; files?: SnapItem[] };
    const snap = v.driveSnapshotJson as Snap | null | undefined;
    const firstId = snap?.ids?.[0] ?? snap?.files?.[0]?.id ?? null;
    if (firstId) return driveImageThumbnailUrl(firstId, 480);
    return null;
  }

  if (v.embedKind === EmbedKind.YOUTUBE && v.externalUrl) {
    const id = extractYouTubeId(v.externalUrl);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  if (v.embedKind === EmbedKind.VIMEO && v.externalUrl) {
    const id = extractVimeoId(v.externalUrl);
    // vumbnail.com es un servicio público que devuelve el cover de un video Vimeo
    // sin necesidad de autenticación. Si Vimeo bloquea referer en el futuro,
    // se podría reemplazar por la API oficial.
    if (id) return `https://vumbnail.com/${id}.jpg`;
  }

  if (v.embedKind === EmbedKind.IMAGE && v.externalUrl) {
    return v.externalUrl;
  }

  // DIRECT_VIDEO sin frame extraído → null (en el futuro, capturar al upload)
  return null;
}
