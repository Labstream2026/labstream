import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCmsUser } from "@/lib/cms-guard";
import { FONT_OPTIONS } from "@/lib/site-settings";
import { AppearanceForm } from "@/components/cms/AppearanceForm";

async function saveAppearance(formData: FormData) {
  "use server";
  await requireCmsUser();

  const fontHeading = String(formData.get("fontHeading") ?? "Instrument Serif");
  const fontBody = String(formData.get("fontBody") ?? "Figtree");
  const colorPrimary = String(formData.get("colorPrimary") ?? "#E8640C");
  const colorAccent = String(formData.get("colorAccent") ?? "#7B61FF");
  const colorBg = String(formData.get("colorBg") ?? "#080808");
  const colorText = String(formData.get("colorText") ?? "#F0F0EE");
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const faviconUrl = String(formData.get("faviconUrl") ?? "").trim() || null;

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
  await requireCmsUser();
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });

  return (
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
  );
}
