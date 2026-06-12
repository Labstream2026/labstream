import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/cms-guard";
import { FormShortcuts } from "@/components/cms/form";
import { LivePreview } from "@/components/cms/LivePreview";

async function saveSettings(formData: FormData) {
  "use server";
  await requireSuperAdmin();

  const siteName = String(formData.get("siteName") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim() || null;
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const instagram = String(formData.get("instagram") ?? "").trim();
  const vimeo = String(formData.get("vimeo") ?? "").trim();
  const youtube = String(formData.get("youtube") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();

  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: {
      siteName,
      tagline,
      contactEmail,
      socials: { instagram, vimeo, youtube, linkedin },
    },
  });

  revalidatePath("/");
  revalidatePath("/cms/settings");
}

export default async function SettingsPage() {
  await requireSuperAdmin();
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });
  const socials = (settings?.socials as Record<string, string> | null) ?? {};

  return (
    <LivePreview mode="config" model="settings" previewPath="/">
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Configuración
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Ajustes del sitio
        </h1>
      </div>

      <form
        action={saveSettings}
        className="lg grid grid-cols-1 gap-4 rounded-2xl p-6 md:grid-cols-2"
      >
        <FormShortcuts />
        <Field
          name="siteName"
          label="Nombre del sitio"
          defaultValue={settings?.siteName ?? ""}
        />
        <Field
          name="contactEmail"
          label="Email de contacto"
          defaultValue={settings?.contactEmail ?? ""}
          type="email"
        />
        <div className="md:col-span-2">
          <Field
            name="tagline"
            label="Tagline"
            defaultValue={settings?.tagline ?? ""}
          />
        </div>

        <h2 className="md:col-span-2 mt-2 text-[14px] font-semibold text-white">
          Redes sociales
        </h2>
        <Field name="instagram" label="Instagram" defaultValue={socials.instagram ?? ""} />
        <Field name="vimeo" label="Vimeo" defaultValue={socials.vimeo ?? ""} />
        <Field name="youtube" label="YouTube" defaultValue={socials.youtube ?? ""} />
        <Field name="linkedin" label="LinkedIn" defaultValue={socials.linkedin ?? ""} />

        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Guardar ajustes
          </button>
        </div>
      </form>
    </div>
    </LivePreview>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
      />
    </label>
  );
}
