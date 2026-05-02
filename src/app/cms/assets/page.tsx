import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser } from "@/lib/cms-guard";
import { AssetSource } from "@prisma/client";

async function addUrlAsset(formData: FormData) {
  "use server";
  const me = await requireCmsUser();

  const url = String(formData.get("url") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim() || null;

  if (!url || !/^https?:\/\//i.test(url)) {
    redirect("/cms/assets?error=invalid_url");
  }

  await prisma.asset.create({
    data: {
      source: AssetSource.URL,
      url,
      alt,
      uploadedById: me.id,
    },
  });

  revalidatePath("/cms/assets");
  redirect("/cms/assets?ok=added");
}

async function deleteAsset(formData: FormData) {
  "use server";
  await requireCmsUser();
  const id = String(formData.get("id") ?? "");
  await prisma.asset.delete({ where: { id } }).catch(() => null);
  revalidatePath("/cms/assets");
}

export default async function AssetsPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;

  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { uploadedBy: { select: { name: true, email: true } } },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Recursos
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Medios
        </h1>
        <p className="mt-2 text-[14px] text-white/55">
          Sube archivos o agrega imágenes/videos por URL externa (Vimeo, YouTube,
          Cloudinary, etc.).
        </p>
      </div>

      {sp.ok === "added" && (
        <Banner kind="ok" text="Recurso agregado correctamente." />
      )}
      {sp.ok === "uploaded" && (
        <Banner kind="ok" text="Archivo subido correctamente." />
      )}
      {sp.error === "invalid_url" && (
        <Banner kind="error" text="URL inválida. Debe empezar con http o https." />
      )}
      {sp.error === "upload_failed" && (
        <Banner kind="error" text="No fue posible subir el archivo." />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="lg rounded-2xl p-6">
          <h2 className="mb-4 text-[14px] font-semibold text-white">
            Subir desde tu computador
          </h2>
          <form
            action="/api/upload"
            method="post"
            encType="multipart/form-data"
            className="flex flex-col gap-3"
          >
            <input
              type="file"
              name="file"
              required
              className="block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white file:mr-3 file:rounded-md file:border-0 file:bg-orange file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
            />
            <input
              name="alt"
              placeholder="Texto alternativo (opcional)"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white"
            />
            <button type="submit" className="btn-primary self-start">
              Subir archivo
            </button>
            <p className="text-[11px] text-white/40">
              Tamaño máximo {process.env.MAX_UPLOAD_MB ?? 50} MB. Para videos
              grandes preferimos URL externa.
            </p>
          </form>
        </div>

        <div className="lg rounded-2xl p-6">
          <h2 className="mb-4 text-[14px] font-semibold text-white">
            Agregar desde URL externa
          </h2>
          <form action={addUrlAsset} className="flex flex-col gap-3">
            <input
              name="url"
              required
              placeholder="https://… (Vimeo, YouTube, S3, Drive)"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white"
            />
            <input
              name="alt"
              placeholder="Descripción / texto alternativo"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white"
            />
            <button type="submit" className="btn-primary self-start">
              Agregar URL
            </button>
          </form>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-[14px] font-semibold text-white">
          Biblioteca ({assets.length})
        </h2>

        {assets.length === 0 ? (
          <div className="lg rounded-2xl p-10 text-center text-[13px] text-white/55">
            Aún no has agregado recursos.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {assets.map((a) => (
              <div key={a.id} className="lg overflow-x-auto rounded-2xl">
                <div
                  className="flex aspect-video items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  {a.mimeType?.startsWith("image/") ||
                  /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(a.url) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.url}
                      alt={a.alt ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-[10px] uppercase tracking-widest text-white/40">
                      {a.mimeType ?? "Recurso"}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        background:
                          a.source === AssetSource.UPLOAD
                            ? "rgba(123,97,255,0.13)"
                            : "rgba(232,100,12,0.13)",
                        color:
                          a.source === AssetSource.UPLOAD
                            ? "#B6A4FF"
                            : "#FFB174",
                      }}
                    >
                      {a.source === AssetSource.UPLOAD ? "subido" : "url"}
                    </span>
                  </div>
                  <div
                    className="truncate text-[11px] text-white/60"
                    title={a.url}
                  >
                    {a.filename ?? a.url}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-orange hover:underline"
                    >
                      Abrir ↗
                    </a>
                    <form action={deleteAsset}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="text-[11px] text-white/45 hover:text-red-400"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Banner({ kind, text }: { kind: "ok" | "error"; text: string }) {
  const ok = kind === "ok";
  return (
    <div
      className="mb-4 rounded-lg border px-3.5 py-2.5 text-[13px]"
      style={{
        borderColor: ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
        background: ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: ok ? "#A7F3C0" : "#FCA5A5",
      }}
    >
      {text}
    </div>
  );
}
