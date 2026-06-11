import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings, buildGoogleFontsUrl } from "@/lib/site-settings";

// Todo el sitio se sirve desde la base de datos (CMS). Forzamos render
// dinámico para que `next build` no intente pre-renderizar páginas
// consultando la BD — en el build de Docker no hay BD disponible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: {
      default: `${site.siteName}${site.tagline ? ` — ${site.tagline}` : ""}`,
      template: `%s — ${site.siteName}`,
    },
    description:
      site.tagline ??
      "Producción audiovisual de vanguardia, fusionada con inteligencia artificial.",
    icons: site.faviconUrl ? { icon: site.faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteSettings();
  const fontsUrl = buildGoogleFontsUrl(site.fontHeading, site.fontBody);

  // Defensa en profundidad: este bloque va en un <style dangerouslySetInnerHTML>,
  // así que saneamos los valores aunque ya se validen al guardarlos (evita XSS
  // si la BD trae datos viejos/manipulados).
  const hex = (v: string | null | undefined, fb: string) =>
    /^#[0-9a-fA-F]{6}$/.test((v ?? "").trim()) ? (v as string).trim() : fb;
  // Para el nombre de fuente solo permitimos letras/números/espacios/guiones.
  const font = (v: string | null | undefined, fb: string) =>
    /^[a-zA-Z0-9 _-]{1,40}$/.test((v ?? "").trim()) ? (v as string).trim() : fb;

  const cPrimary = hex(site.colorPrimary, "#E8640C");
  const cAccent = hex(site.colorAccent, "#7B61FF");
  const cBg = hex(site.colorBg, "#080808");
  const cText = hex(site.colorText, "#F0F0EE");
  const fHeading = font(site.fontHeading, "Instrument Serif");
  const fBody = font(site.fontBody, "Figtree");

  // Inyectamos las CSS variables como style en el <html> para que
  // todos los componentes con var(--xxx) las hereden.
  const themeStyle = `
    :root {
      --color-primary: ${cPrimary};
      --color-accent: ${cAccent};
      --color-bg: ${cBg};
      --color-text: ${cText};
      --orange: ${cPrimary};
      --accent: ${cAccent};
      --bg: ${cBg};
      --text: ${cText};
      --font-heading: '${fHeading}', serif;
      --font-body: '${fBody}', sans-serif;
    }
  `;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={fontsUrl} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
