import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { ImageField } from "@/components/cms/ImageField";

type Capability = { icon: string; title: string; desc: string };
type ProcessStep = { step: string; title: string; desc: string };

function parseCapabilities(raw: string): Capability[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        icon: parts[0] ?? "•",
        title: parts[1] ?? "",
        desc: parts.slice(2).join(" | "),
      };
    })
    .filter((c) => c.title);
}

function capabilitiesToText(items: Capability[]): string {
  return items.map((c) => `${c.icon} | ${c.title} | ${c.desc}`).join("\n");
}

function parseProcess(raw: string): ProcessStep[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        step: parts[0] ?? "",
        title: parts[1] ?? "",
        desc: parts.slice(2).join(" | "),
      };
    })
    .filter((p) => p.title);
}

function processToText(items: ProcessStep[]): string {
  return items.map((p) => `${p.step} | ${p.title} | ${p.desc}`).join("\n");
}

async function saveServiceDetail(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect(`/cms/services?error=denied`);

  const id = String(formData.get("id") ?? "");
  const longDescription =
    String(formData.get("longDescription") ?? "").trim() || null;
  const heroImageUrl =
    String(formData.get("heroImageUrl") ?? "").trim() || null;
  const pricing = String(formData.get("pricing") ?? "").trim() || null;

  const capRaw = String(formData.get("capabilities") ?? "").trim();
  const capabilities = capRaw
    ? (parseCapabilities(capRaw) as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  const processRaw = String(formData.get("process") ?? "").trim();
  const process = processRaw
    ? (parseProcess(processRaw) as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) redirect(`/cms/services?error=invalid`);

  await prisma.service.update({
    where: { id },
    data: { longDescription, heroImageUrl, pricing, capabilities, process },
  });

  revalidatePath("/servicios");
  if (svc) revalidatePath(`/servicio/${svc.slug}`);
  revalidatePath(`/cms/services/${id}`);
  redirect(`/cms/services/${id}?ok=saved`);
}

export default async function ServiceDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;
  const sp = await props.searchParams;

  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) notFound();

  const capabilities = (svc.capabilities as Capability[] | null) ?? [];
  const process = (svc.process as ProcessStep[] | null) ?? [];

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/cms/services"
          className="text-[12px] text-white/55 hover:text-white"
        >
          ← Volver a servicios
        </Link>
        <Link
          href={`/servicio/${svc.slug}`}
          target="_blank"
          className="text-[12px] text-orange hover:underline"
        >
          Ver en sitio público ↗
        </Link>
      </div>

      <div className="mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Detalle de servicio
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {svc.title}
        </h1>
        <p className="mt-1 text-[13px] text-white/55">
          /{svc.slug} · Aparece en /servicio/{svc.slug}. Para cambiar título o
          resumen corto, usa la lista de servicios.
        </p>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

      <form
        action={saveServiceDetail}
        className="lg flex flex-col gap-6 rounded-2xl p-6 md:p-8"
      >
        <input type="hidden" name="id" value={svc.id} />

        <Section title="Hero del detalle">
          <ImageField
            name="heroImageUrl"
            label="Imagen de fondo del hero"
            defaultValue={svc.heroImageUrl}
            help="Imagen grande detrás del título"
            aspect="wide"
          />
          <Labeled
            label="Descripción larga"
            help="Párrafo amplio bajo el título del hero (2-4 líneas)"
          >
            <Textarea
              name="longDescription"
              defaultValue={svc.longDescription ?? ""}
              rows={4}
            />
          </Labeled>
        </Section>

        <Section
          title="Capacidades"
          help="Una capacidad por línea. Formato: ICONO | TÍTULO | DESCRIPCIÓN. Aparecen en el grid 'Capacidades'."
        >
          <Textarea
            name="capabilities"
            defaultValue={capabilitiesToText(capabilities)}
            rows={6}
            mono
            placeholder="🎬 | Comerciales TV | Spots de 15s a 90s
📹 | Branded content | Historias de marca"
          />
        </Section>

        <Section
          title="Proceso"
          help="Un paso por línea. Formato: NÚMERO | TÍTULO | DESCRIPCIÓN. Aparecen como tarjetas numeradas."
        >
          <Textarea
            name="process"
            defaultValue={processToText(process)}
            rows={6}
            mono
            placeholder="01 | Brief | Entendemos el objetivo
02 | Tratamiento | Propuesta visual y narrativa"
          />
        </Section>

        <Section title="Pricing">
          <Labeled
            label="Texto de inversión"
            help="Aparece como CTA al final del detalle"
          >
            <Input
              name="pricing"
              defaultValue={svc.pricing ?? ""}
              placeholder="Desde $XXM COP — Cotización personalizada según alcance"
            />
          </Labeled>
        </Section>

        <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
          <Link
            href="/cms/services"
            className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] text-white/70 hover:bg-white/5"
          >
            Cancelar
          </Link>
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/5 pt-5 first:border-0 first:pt-0">
      <div>
        <div className="text-[14px] font-semibold text-white">{title}</div>
        {help && <div className="mt-0.5 text-[12px] text-white/45">{help}</div>}
      </div>
      {children}
    </div>
  );
}

function Labeled({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      {children}
      {help && <span className="text-[11px] text-white/40">{help}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none ${props.className ?? ""}`}
    />
  );
}

function Textarea({
  mono,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) {
  return (
    <textarea
      {...rest}
      className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-white focus:border-orange/50 focus:outline-none ${mono ? "font-mono text-[12px]" : ""} ${rest.className ?? ""}`}
    />
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
