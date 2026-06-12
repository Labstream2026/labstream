import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/cms-guard";
import { FONT_OPTIONS } from "@/lib/site-settings";
import { AppearanceForm } from "@/components/cms/AppearanceForm";
import { LivePreview } from "@/components/cms/LivePreview";

/** Acepta solo hex #RRGGBB; cualquier otra cosa cae al default. Estos valores
 *  se interpolan en un <style dangerouslySetInnerHTML> del sitio público, así
 *  que sin validación serían un vector de XSS almacenado de alcance total. */
function safeHex(raw: FormDataEntryValue | null, fallback: string): string {
  const v = String(raw ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

/** La fuente también se interpola en el <style>; solo permitimos las del catálogo. */
const ALLOWED_FONTS = new Set<string>([...FONT_OPTIONS.heading, ...FONT_OPTIONS.body]);
function safeFont(raw: FormDataEntryValue | null, fallback: string): string {
  const v = String(raw ?? "").trim();
  return ALLOWED_FONTS.has(v) ? v : fallback;
}

/** logo/favicon se usan como src de <img>; solo http(s) o rutas internas. */
function safeAssetUrl(raw: FormDataEntryValue | null): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  return /^(https?:\/\/|\/)/i.test(v) ? v : null;
}

async function saveAppearance(formData: FormData) {
  "use server";
  // Cambia la apariencia de TODO el sitio público (sink de XSS): solo SUPER_ADMIN.
  await requireSuperAdmin();

  const fontHeading = safeFont(formData.get("fontHeading"), "Instrument Serif");
  const fontBody = safeFont(formData.get("fontBody"), "Figtree");
  const colorPrimary = safeHex(formData.get("colorPrimary"), "#E8640C");
  const colorAccent = safeHex(formData.get("colorAccent"), "#7B61FF");
  const colorBg = safeHex(formData.get("colorBg"), "#080808");
  const colorText = safeHex(formData.get("colorText"), "#F0F0EE");
  const logoUrl = safeAssetUrl(formData.get("logoUrl"));
  const faviconUrl = safeAssetUrl(formData.get("faviconUrl"));

  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: {
      fontHeading,
      fontBody,
      colorPrimary,
      colorAccent,
      colorBg,
      colorText,
      logoUrl,
      faviconUrl,
    },
  });

  revalidatePath("/");
  revalidatePath("/cms/appearance");
}

export default async function AppearancePage() {
  await requireSuperAdmin();
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });

  return (
    <LivePreview mode="config" model="appearance" previewPath="/">
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Apariencia
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Tipografía y colores
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Cambia las fuentes, los colores y el logo del sitio público. Los
          cambios se aplican inmediatamente al guardar.
        </p>
      </div>

      <AppearanceForm
        action={saveAppearance}
        initial={{
          fontHeading: settings?.fontHeading ?? "Instrument Serif",
          fontBody: settings?.fontBody ?? "Figtree",
          colorPrimary: settings?.colorPrimary ?? "#E8640C",
          colorAccent: settings?.colorAccent ?? "#7B61FF",
          colorBg: settings?.colorBg ?? "#080808",
          colorText: settings?.colorText ?? "#F0F0EE",
          logoUrl: settings?.logoUrl ?? "",
          faviconUrl: settings?.faviconUrl ?? "",
        }}
        fontOptions={FONT_OPTIONS}
      />
    </div>
    </LivePreview>
  );
}
