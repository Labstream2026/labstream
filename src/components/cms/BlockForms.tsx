"use client";

import { useState } from "react";
import type { BlockType } from "@/lib/blocks";
import { AssetPicker } from "@/components/cms/AssetPicker";

type BaseProps = {
  blockId: string;
  data: Record<string, unknown>;
  saveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  moveUpAction: (formData: FormData) => void;
  moveDownAction: (formData: FormData) => void;
};

type Props = BaseProps & { type: BlockType };

export function BlockForm(props: Props) {
  switch (props.type) {
    case "hero":
      return <HeroForm {...props} />;
    case "stats":
      return <StatsForm {...props} />;
    case "richText":
      return <RichTextForm {...props} />;
    case "gallery":
      return <GalleryForm {...props} />;
    case "videoEmbed":
      return <VideoEmbedForm {...props} />;
    case "cta":
      return <CtaForm {...props} />;
    case "featureList":
      return <FeatureListForm {...props} />;
    case "image":
      return <ImageForm {...props} />;
    case "carousel":
      return <CarouselForm {...props} />;
    default:
      return (
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-4 text-[12px] text-white/70">
          {JSON.stringify(props.data, null, 2)}
        </pre>
      );
  }
}

function FormShell({
  blockId,
  saveAction,
  deleteAction,
  moveUpAction,
  moveDownAction,
  children,
}: BaseProps & { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <form action={moveUpAction} className="contents">
          <input type="hidden" name="blockId" value={blockId} />
          <button
            type="submit"
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/65 hover:bg-white/5 hover:text-white"
            title="Mover arriba"
          >
            ↑
          </button>
        </form>
        <form action={moveDownAction} className="contents">
          <input type="hidden" name="blockId" value={blockId} />
          <button
            type="submit"
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/65 hover:bg-white/5 hover:text-white"
            title="Mover abajo"
          >
            ↓
          </button>
        </form>
        <form
          action={deleteAction}
          className="contents"
          onSubmit={(e) => {
            if (!confirm("¿Eliminar este bloque?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="blockId" value={blockId} />
          <button
            type="submit"
            className="ml-auto rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
          >
            Eliminar
          </button>
        </form>
      </div>

      <form action={saveAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input type="hidden" name="blockId" value={blockId} />
        {children}
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Guardar bloque
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  multiline,
  rows = 3,
  type = "text",
  full,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
        />
      )}
    </label>
  );
}

function HeroForm(props: Props) {
  const d = props.data as Record<string, string>;
  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior (badge)" defaultValue={d.eyebrow} />
      <Field name="title" label="Título principal" defaultValue={d.title} />
      <Field name="subtitle" label="Subtítulo" defaultValue={d.subtitle} multiline full />
      <Field name="ctaLabel" label="Botón primario — texto" defaultValue={d.ctaLabel} />
      <Field name="ctaHref" label="Botón primario — link" defaultValue={d.ctaHref} />
      <Field name="secondaryLabel" label="Botón secundario — texto" defaultValue={d.secondaryLabel} />
      <Field name="secondaryHref" label="Botón secundario — link" defaultValue={d.secondaryHref} />
    </FormShell>
  );
}

function StatsForm(props: Props) {
  const items = ((props.data.items as { value: string; label: string }[]) ?? []).slice(0, 6);
  while (items.length < 4) items.push({ value: "", label: "" });

  return (
    <FormShell {...props}>
      <p className="md:col-span-2 -mb-2 text-[12px] text-white/55">
        Hasta 6 estadísticas. Deja en blanco las que no uses.
      </p>
      {items.map((it, i) => (
        <div key={i} className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            name={`item_${i}_value`}
            defaultValue={it.value}
            placeholder={`Valor ${i + 1} (ej: 12+)`}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
          />
          <input
            name={`item_${i}_label`}
            defaultValue={it.label}
            placeholder="Descripción"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white md:col-span-2"
          />
        </div>
      ))}
    </FormShell>
  );
}

function RichTextForm(props: Props) {
  const d = props.data as Record<string, string>;
  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior" defaultValue={d.eyebrow} />
      <Field name="heading" label="Encabezado" defaultValue={d.heading} />
      <Field name="body" label="Contenido" defaultValue={d.body} multiline rows={6} full />
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          Alineación
        </span>
        <select
          name="align"
          defaultValue={d.align ?? "left"}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
        </select>
      </label>
    </FormShell>
  );
}

function GalleryForm(props: Props) {
  const initial =
    (props.data.images as { url: string; alt?: string; caption?: string }[]) ?? [];
  const [images, setImages] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cols = (props.data.columns as number) ?? 3;

  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior" defaultValue={props.data.eyebrow as string ?? ""} />
      <Field name="heading" label="Encabezado" defaultValue={props.data.heading as string ?? ""} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          Columnas (1-4)
        </span>
        <input
          type="number"
          name="columns"
          min={1}
          max={4}
          defaultValue={cols}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
        />
      </label>
      <div className="md:col-span-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Imágenes
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-md border border-orange/40 bg-orange/10 px-2.5 py-1 text-[12px] font-medium text-orange hover:bg-orange/20"
          >
            + Elegir de biblioteca
          </button>
        </div>
        {images.map((img, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 md:grid-cols-[80px_2fr_1fr_1fr_auto]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ""}
              className="hidden md:block aspect-square rounded-md object-cover"
              referrerPolicy="no-referrer"
            />
            <input
              name={`img_${i}_url`}
              defaultValue={img.url}
              placeholder="URL"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <input
              name={`img_${i}_alt`}
              defaultValue={img.alt ?? ""}
              placeholder="Alt"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <input
              name={`img_${i}_caption`}
              defaultValue={img.caption ?? ""}
              placeholder="Leyenda"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <button
              type="button"
              onClick={() => setImages(images.filter((_, j) => j !== i))}
              className="rounded-md border border-red-500/30 px-2 text-[12px] text-red-300 hover:bg-red-500/10"
            >
              ×
            </button>
          </div>
        ))}
        <input type="hidden" name="image_count" value={images.length} />
      </div>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(asset) => {
          setImages([...images, { url: asset.url, alt: asset.alt ?? "", caption: "" }]);
        }}
        filter="image"
        multi
        onPickMulti={(picked) => {
          setImages([
            ...images,
            ...picked.map((p) => ({ url: p.url, alt: p.alt ?? "", caption: "" })),
          ]);
        }}
      />
    </FormShell>
  );
}

function CarouselForm(props: Props) {
  const initial =
    (props.data.slides as { url: string; alt?: string; caption?: string; linkHref?: string }[]) ?? [];
  const [slides, setSlides] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = props.data as Record<string, unknown>;

  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior" defaultValue={d.eyebrow as string ?? ""} />
      <Field name="heading" label="Encabezado" defaultValue={d.heading as string ?? ""} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          Aspect ratio
        </span>
        <select
          name="aspectRatio"
          defaultValue={(d.aspectRatio as string) ?? "16/9"}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
        >
          <option value="16/9">16:9 (panorámico)</option>
          <option value="4/3">4:3 (clásico)</option>
          <option value="1/1">1:1 (cuadrado)</option>
          <option value="21/9">21:9 (cinema)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          Intervalo (segundos)
        </span>
        <input
          type="number"
          name="intervalSeconds"
          min={2}
          max={20}
          defaultValue={(d.intervalSeconds as number) ?? 5}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
        />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-white/75">
        <input
          type="checkbox"
          name="autoplay"
          defaultChecked={(d.autoplay as boolean) ?? true}
        />
        Autoplay
      </label>
      <label className="flex items-center gap-2 text-[13px] text-white/75">
        <input
          type="checkbox"
          name="loop"
          defaultChecked={(d.loop as boolean) ?? true}
        />
        Loop infinito
      </label>
      <label className="flex items-center gap-2 text-[13px] text-white/75 md:col-span-2">
        <input
          type="checkbox"
          name="indicators"
          defaultChecked={(d.indicators as boolean) ?? true}
        />
        Mostrar puntitos indicadores
      </label>

      <div className="md:col-span-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Slides ({slides.length})
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-md border border-orange/40 bg-orange/10 px-2.5 py-1 text-[12px] font-medium text-orange hover:bg-orange/20"
          >
            + Elegir de biblioteca
          </button>
        </div>
        {slides.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 md:grid-cols-[80px_1fr_1fr_1fr_auto]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={s.alt ?? ""}
              className="hidden md:block aspect-video rounded-md object-cover"
              referrerPolicy="no-referrer"
            />
            <input
              name={`slide_${i}_url`}
              defaultValue={s.url}
              placeholder="URL"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <input
              name={`slide_${i}_caption`}
              defaultValue={s.caption ?? ""}
              placeholder="Leyenda"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <input
              name={`slide_${i}_linkHref`}
              defaultValue={s.linkHref ?? ""}
              placeholder="Link al hacer click (opcional)"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <button
              type="button"
              onClick={() => setSlides(slides.filter((_, j) => j !== i))}
              className="rounded-md border border-red-500/30 px-2 text-[12px] text-red-300 hover:bg-red-500/10"
            >
              ×
            </button>
          </div>
        ))}
        <input type="hidden" name="slide_count" value={slides.length} />
      </div>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(asset) =>
          setSlides([...slides, { url: asset.url, alt: asset.alt ?? "", caption: "", linkHref: "" }])
        }
        filter="image"
        multi
        onPickMulti={(picked) =>
          setSlides([
            ...slides,
            ...picked.map((p) => ({
              url: p.url,
              alt: p.alt ?? "",
              caption: "",
              linkHref: "",
            })),
          ])
        }
      />
    </FormShell>
  );
}

function VideoEmbedForm(props: Props) {
  const d = props.data as Record<string, string>;
  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior" defaultValue={d.eyebrow} />
      <Field name="heading" label="Encabezado" defaultValue={d.heading} />
      <Field
        name="url"
        label="URL del video (YouTube / Vimeo / .mp4)"
        defaultValue={d.url}
        full
      />
      <Field name="caption" label="Leyenda" defaultValue={d.caption} full />
    </FormShell>
  );
}

function CtaForm(props: Props) {
  const d = props.data as Record<string, string>;
  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior" defaultValue={d.eyebrow} />
      <Field name="title" label="Título" defaultValue={d.title} />
      <Field name="body" label="Descripción" defaultValue={d.body} multiline full />
      <Field name="ctaLabel" label="Texto del botón" defaultValue={d.ctaLabel} />
      <Field name="ctaHref" label="Link del botón" defaultValue={d.ctaHref} />
    </FormShell>
  );
}

function FeatureListForm(props: Props) {
  const initial =
    (props.data.items as { icon?: string; title: string; desc?: string }[]) ?? [];
  const [items, setItems] = useState(initial);
  const cols = (props.data.columns as number) ?? 3;

  return (
    <FormShell {...props}>
      <Field name="eyebrow" label="Texto superior" defaultValue={props.data.eyebrow as string ?? ""} />
      <Field name="heading" label="Encabezado" defaultValue={props.data.heading as string ?? ""} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          Columnas (1-4)
        </span>
        <input
          type="number"
          name="columns"
          min={1}
          max={4}
          defaultValue={cols}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
        />
      </label>
      <div className="md:col-span-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Items
          </span>
          <button
            type="button"
            onClick={() => setItems([...items, { icon: "", title: "", desc: "" }])}
            className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-white/80 hover:bg-white/5"
          >
            + Agregar item
          </button>
        </div>
        {items.map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 md:grid-cols-[60px_1fr_2fr_auto]"
          >
            <input
              name={`feat_${i}_icon`}
              defaultValue={it.icon ?? ""}
              placeholder="🎬"
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[14px] text-white"
            />
            <input
              name={`feat_${i}_title`}
              defaultValue={it.title}
              placeholder="Título"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <input
              name={`feat_${i}_desc`}
              defaultValue={it.desc ?? ""}
              placeholder="Descripción"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
            />
            <button
              type="button"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="rounded-md border border-red-500/30 px-2 text-[12px] text-red-300 hover:bg-red-500/10"
            >
              ×
            </button>
          </div>
        ))}
        <input type="hidden" name="feat_count" value={items.length} />
      </div>
    </FormShell>
  );
}

function ImageForm(props: Props) {
  const d = props.data as Record<string, unknown>;
  const [url, setUrl] = useState((d.url as string) ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <FormShell {...props}>
      <div className="md:col-span-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Imagen
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-md border border-orange/40 bg-orange/10 px-2.5 py-1 text-[12px] font-medium text-orange hover:bg-orange/20"
          >
            {url ? "Cambiar imagen" : "+ Elegir imagen"}
          </button>
        </div>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-48 rounded-lg border border-white/10 object-contain bg-black/40"
            referrerPolicy="no-referrer"
          />
        )}
        <input
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
        />
      </div>
      <Field name="alt" label="Texto alternativo" defaultValue={d.alt as string ?? ""} />
      <Field name="caption" label="Leyenda" defaultValue={d.caption as string ?? ""} />
      <label className="md:col-span-2 flex items-center gap-2 text-[13px] text-white/75">
        <input
          type="checkbox"
          name="fullWidth"
          defaultChecked={Boolean(d.fullWidth)}
        />
        Mostrar a ancho completo
      </label>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(asset) => setUrl(asset.url)}
        filter="image"
      />
    </FormShell>
  );
}
