import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings, buildGoogleFontsUrl } from "@/lib/site-settings";

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

  // Inyectamos las CSS variables como style en el <html> para que
  // todos los componentes con var(--xxx) las hereden.
  const themeStyle = `
    :root {
      --color-primary: ${site.colorPrimary};
      --color-accent: ${site.colorAccent};
      --color-bg: ${site.colorBg};
      --color-text: ${site.colorText};
      --orange: ${site.colorPrimary};
      --accent: ${site.colorAccent};
      --bg: ${site.colorBg};
      --text: ${site.colorText};
      --font-heading: '${site.fontHeading}', serif;
      --font-body: '${site.fontBody}', sans-serif;
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
