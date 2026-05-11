import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { SortableList } from "@/components/cms/SortableList";
import { PageHeader, FormShortcuts } from "@/components/cms/form";
import { ConfirmButton } from "@/components/cms/ConfirmButton";

async function saveFaq(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/faqs");
  }

  const id = String(formData.get("id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const orderRaw = parseInt(String(formData.get("order") ?? "0"), 10);
  const order = Number.isFinite(orderRaw) ? orderRaw : 0;

  if (!question || !answer) {
    await setError("Faltan campos obligatorios: pregunta y respuesta.");
    redirect("/cms/faqs");
  }

  await prisma.faqItem.update({
    where: { id },
    data: { question, answer, category, visible, order },
  });

  revalidatePath("/");
  revalidatePath("/contacto");
  revalidatePath("/cms/faqs");
  await setSuccess("Cambios guardados.");
  redirect("/cms/faqs");
}

async function createFaq(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/faqs");
  }

  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();

  if (!question || !answer) {
    await setError("Faltan campos obligatorios: pregunta y respuesta.");
    redirect("/cms/faqs");
  }

  const top = await prisma.faqItem.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.faqItem.create({
    data: {
      question,
      answer,
      category:
        String(formData.get("category") ?? "").trim() || null,
      order: (top?.order ?? -1) + 1,
    },
  });

  revalidatePath("/");
  revalidatePath("/contacto");
  revalidatePath("/cms/faqs");
  await setSuccess("FAQ creada.");
  redirect("/cms/faqs");
}

async function reorderFaqs(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) return;
  const ids = String(formData.get("orderedIds") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.faqItem.update({ where: { id }, data: { order: i } }),
    ),
  );
  revalidatePath("/");
  revalidatePath("/contacto");
  revalidatePath("/cms/faqs");
}

async function deleteFaq(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/faqs");
  }

  const id = String(formData.get("id") ?? "");
  await prisma.faqItem.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/contacto");
  revalidatePath("/cms/faqs");
  await setSuccess("FAQ eliminada.");
  redirect("/cms/faqs");
}

export default async function FaqsPage() {
  await requireCmsUser();

  const items = await prisma.faqItem.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Preguntas frecuentes"
        subtitle="Aparecen en el accordion de la home y al final de /contacto."
      />

      {items.length === 0 ? (
        <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
          Aún no hay FAQs. Agrega la primera abajo.
        </div>
      ) : (
        <SortableList
          reorderAction={reorderFaqs}
          items={items.map((f) => ({
            id: f.id,
            content: (
              <form
                action={saveFaq}
                className="lg flex flex-col gap-3 rounded-2xl p-5"
              >
            <input type="hidden" name="id" value={f.id} />
            <FormShortcuts />

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Pregunta
              </span>
              <input
                name="question"
                defaultValue={f.question}
                required
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] font-medium text-white focus:border-orange/50 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Respuesta
              </span>
              <textarea
                name="answer"
                defaultValue={f.answer}
                rows={3}
                required
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Categoría
                </span>
                <input
                  name="category"
                  defaultValue={f.category ?? ""}
                  placeholder="Servicios, Pago, Proceso…"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white focus:border-orange/50 focus:outline-none"
                />
              </label>
              <input type="hidden" name="order" value={f.order} />
              <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked={f.visible}
                />
                Visible
              </label>
              <ConfirmButton
                action={deleteFaq}
                hiddenFields={{ id: f.id }}
                title="Eliminar FAQ"
                description={<>¿Quieres eliminar la pregunta <strong>{f.question}</strong>? Esta acción no se puede deshacer.</>}
                confirmLabel="Eliminar"
                ariaLabel="Eliminar FAQ"
                className="rounded-md border border-red-500/20 px-2.5 py-2 text-[11px] text-red-300 hover:bg-red-500/10"
              >
                Eliminar
              </ConfirmButton>
              <button
                type="submit"
                className="ml-auto rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
              >
                Guardar
              </button>
            </div>
          </form>
            ),
          }))}
        />
      )}

      <div className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Nueva pregunta
        </h2>
        <form
          action={createFaq}
          className="lg flex flex-col gap-3 rounded-2xl p-6"
        >
          <FormShortcuts />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Pregunta
            </span>
            <input
              name="question"
              required
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Respuesta
            </span>
            <textarea
              name="answer"
              rows={3}
              required
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5 max-w-xs">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Categoría (opcional)
            </span>
            <input
              name="category"
              placeholder="Servicios, Pago, Proceso…"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <button type="submit" className="btn-primary self-start">
            Crear FAQ
          </button>
        </form>
      </div>
    </div>
  );
}

