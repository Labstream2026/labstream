import { getSiteDraft } from "@/lib/preview";
import { buildGoogleFontsUrl } from "@/lib/site-settings";

/**
 * En modo vista previa, inyecta un <style> a nivel de página que SOBRESCRIBE
 * las CSS variables del tema con el borrador de apariencia (SiteSettings.draft).
 * Como va en el <body> (después del <style> del layout en el <head>), gana por
 * orden del DOM, así el editor de Apariencia ve sus colores/fuentes en vivo.
 *
 * Sólo debe renderizarse cuando `isPreviewMode` es true.
 */
export async function ThemePreviewStyle() {
  const draft = await getSiteDraft();
  if (!draft) return null;

  const hex = (v: unknown): string | null =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim())
      ? v.trim()
      : null;
  const font = (v: unknown): string | null =>
    typeof v === "string" && /^[a-zA-Z0-9 _-]{1,40}$/.test(v.trim())
      ? v.trim()
      : null;

  const cPrimary = hex(draft.colorPrimary);
  const cAccent = hex(draft.colorAccent);
  const cBg = hex(draft.colorBg);
  const cText = hex(draft.colorText);
  const fHeading = font(draft.fontHeading);
  const fBody = font(draft.fontBody);

  const decls: string[] = [];
  if (cPrimary) decls.push(`--color-primary:${cPrimary};--orange:${cPrimary};`);
  if (cAccent) decls.push(`--color-accent:${cAccent};--accent:${cAccent};`);
  if (cBg) decls.push(`--color-bg:${cBg};--bg:${cBg};`);
  if (cText) decls.push(`--color-text:${cText};--text:${cText};`);
  if (fHeading) decls.push(`--font-heading:'${fHeading}', serif;`);
  if (fBody) decls.push(`--font-body:'${fBody}', sans-serif;`);

  if (decls.length === 0) return null;

  const css = `:root{${decls.join("")}}`;
  const fontsUrl =
    fHeading || fBody
      ? buildGoogleFontsUrl(fHeading ?? "Instrument Serif", fBody ?? "Figtree")
      : null;

  return (
    <>
      {fontsUrl ? <link href={fontsUrl} rel="stylesheet" /> : null}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
