import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { Prisma } from "@prisma/client";
import { RowsEditor } from "@/components/cms/RowsEditor";
import { LivePreview } from "@/components/cms/LivePreview";

type ValueItem = { icon: string; title: string; desc: string };

function parseValuesJson(raw: string): ValueItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        icon: String(r.icon ?? "").trim() || "•",
        title: String(r.title ?? "").trim(),
        desc: String(r.desc ?? "").trim(),
      }))
      .filter((r) => r.title);
  } catch {
    return [];
  }
}

async function saveAbout(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/about?error=denied");

  const heroEyebrow =
    String(formData.get("heroEyebrow") ?? "").trim() || null;
  const heroTitle = String(formData.get("heroTitle") ?? "").trim() || null;
  const heroSubtitle =
    String(formData.get("heroSubtitle") ?? "").trim() || null;
  const story = String(formData.get("story") ?? "").trim() || null;
  const mission = String(formData.get("mission") ?? "").trim() || null;
  const vision = String(formData.get("vision") ?? "").trim() || null;
  const valuesRaw = String(formData.get("values") ?? "").trim();
  const valuesArr = parseValuesJson(valuesRaw);
  const values =
    valuesArr.length > 0
      ? (valuesArr as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  await prisma.aboutContent.upsert({
    where: { id: "singleton" },
    update: {
      heroEyebrow,
      heroTitle,
      heroSubtitle,
      story,
      mission,
      vision,
      values,
      draft: Prisma.JsonNull,
    },
    create: {
      id: "singleton",
      heroEyebrow,
      heroTitle,
      heroSubtitle,
      story,
      mission,
      vision,
      values,
    },
  });

  revalidatePath("/nosotros");
  revalidatePath("/cms/about");
  redirect("/cms/about?ok=saved");
}

export default async function AboutPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;

  const about = await prisma.aboutContent.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const valuesArr = (about.values as ValueItem[] | null) ?? [];

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Web pública
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Acerca de
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Contenido editorial de la página /nosotros — historia, misión, visión
          y valores.
        </p>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

      <LivePreview
        model="about"
        recordId="singleton"
        previewPath="/nosotros"
      >
        <form action={saveAbout} className="lg flex flex-col gap-5 rounded-2xl p-6 md:p-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Labeled
            label="Eyebrow"
            help="Texto pequeño arriba del título (ej: 'Quiénes somos')"
          >
            <input
              name="heroEyebrow"
              defaultValue={about.heroEyebrow ?? ""}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
            />
          </Labeled>
          <Labeled label="Título hero" help="El título italic principal" wide>
            <input
              name="heroTitle"
              defaultValue={about.heroTitle ?? ""}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
            />
          </Labeled>
        </div>

        <Labeled label="Subtítulo" help="Párrafo que aparece debajo del título">
          <textarea
            name="heroSubtitle"
            defaultValue={about.heroSubtitle ?? ""}
            rows={2}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
          />
        </Labeled>

        <Labeled
          label="Historia"
          help="Múltiples párrafos. Separa con líneas en blanco."
        >
          <textarea
            name="story"
            defaultValue={about.story ?? ""}
            rows={8}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-white focus:border-orange/50 focus:outline-none"
          />
        </Labeled>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Labeled label="Misión">
            <textarea
              name="mission"
              defaultValue={about.mission ?? ""}
              rows={3}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
            />
          </Labeled>
          <Labeled label="Visión">
            <textarea
              name="vision"
              defaultValue={about.vision ?? ""}
              rows={3}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
            />
          </Labeled>
        </div>

        <Labeled label="Valores" help="Cada valor con icono, título y descripción.">
          <RowsEditor
            name="values"
            defaultValue={valuesArr}
            addLabel="+ Añadir valor"
            emptyHint="Sin valores definidos."
            fields={[
              { key: "icon", label: "Icono", placeholder: "🎬", span: 1 },
              { key: "title", label: "Título", placeholder: "Cine en todo", span: 2 },
              {
                key: "desc",
                label: "Descripción",
                placeholder: "Aplicamos criterio cinematográfico…",
                type: "textarea",
                span: 3,
              },
            ]}
          />
        </Labeled>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Guardar cambios
          </button>
        </div>
      </form>
      </LivePreview>

      <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-5 text-[12px] text-white/55">
        <div className="mb-2 font-semibold text-white/75">
          Cómo se ve esto en /nosotros
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>Eyebrow + Título + Subtítulo → hero con imagen de fondo.</li>
          <li>
            Historia → bloque con párrafos separados (cada línea en blanco crea un
            párrafo).
          </li>
          <li>Misión + Visión → dos cards lado a lado.</li>
          <li>Valores → grid con ícono, título y descripción.</li>
        </ul>
      </div>
    </div>
  );
}

function Labeled({
  label,
  help,
  wide,
  children,
}: {
  label: string;
  help?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      {children}
      {help && <span className="text-[11px] text-white/40">{help}</span>}
    </label>
  );
}

function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isOk = !!ok;
  const text = isOk
    ? "Cambios guardados"
    : error === "denied"
      ? "No tienes permiso"
      : "Error";
  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-[13px] ${
        isOk
          ? "border-green-500/30 bg-green-500/10 text-green-200"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {text}
    </div>
  );
}
