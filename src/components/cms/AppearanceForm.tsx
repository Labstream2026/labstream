"use client";

import { useState } from "react";
import { AssetPicker } from "@/components/cms/AssetPicker";
import { FormShortcuts } from "@/components/cms/form";

type Initial = {
  fontHeading: string;
  fontBody: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
  logoUrl: string;
  faviconUrl: string;
};

type FontOptions = {
  heading: readonly string[];
  body: readonly string[];
};

export function AppearanceForm({
  action,
  initial,
  fontOptions,
}: {
  action: (formData: FormData) => void;
  initial: Initial;
  fontOptions: FontOptions;
}) {
  const [state, setState] = useState(initial);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [faviconPickerOpen, setFaviconPickerOpen] = useState(false);

  const update = <K extends keyof Initial>(k: K, v: Initial[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        action={action}
        className="lg flex flex-col gap-5 rounded-2xl p-6"
      >
        <FormShortcuts />
        <Section title="Tipografía">
          <FontSelect
            label="Fuente de titulares"
            name="fontHeading"
            value={state.fontHeading}
            options={fontOptions.heading}
            onChange={(v) => update("fontHeading", v)}
          />
          <FontSelect
            label="Fuente de cuerpo"
            name="fontBody"
            value={state.fontBody}
            options={fontOptions.body}
            onChange={(v) => update("fontBody", v)}
          />
        </Section>

        <Section title="Colores">
          <ColorInput
            label="Color primario (CTAs, acentos naranjas)"
            name="colorPrimary"
            value={state.colorPrimary}
            onChange={(v) => update("colorPrimary", v)}
          />
          <ColorInput
            label="Color de acento (morado)"
            name="colorAccent"
            value={state.colorAccent}
            onChange={(v) => update("colorAccent", v)}
          />
          <ColorInput
            label="Color de fondo principal"
            name="colorBg"
            value={state.colorBg}
            onChange={(v) => update("colorBg", v)}
          />
          <ColorInput
            label="Color de texto principal"
            name="colorText"
            value={state.colorText}
            onChange={(v) => update("colorText", v)}
          />
        </Section>

        <Section title="Logo y favicon">
          <MediaPicker
            label="Logo (idealmente SVG transparente)"
            name="logoUrl"
            value={state.logoUrl}
            onChange={(v) => update("logoUrl", v)}
            onOpenPicker={() => setLogoPickerOpen(true)}
          />
          <MediaPicker
            label="Favicon (256x256 PNG/SVG)"
            name="faviconUrl"
            value={state.faviconUrl}
            onChange={(v) => update("faviconUrl", v)}
            onOpenPicker={() => setFaviconPickerOpen(true)}
          />
        </Section>

        <button type="submit" className="btn-primary self-start">
          Guardar apariencia
        </button>
      </form>

      <Preview state={state} />

      <AssetPicker
        open={logoPickerOpen}
        onClose={() => setLogoPickerOpen(false)}
        onPick={(asset) => update("logoUrl", asset.url)}
        filter="image"
      />
      <AssetPicker
        open={faviconPickerOpen}
        onClose={() => setFaviconPickerOpen(false)}
        onPick={(asset) => update("faviconUrl", asset.url)}
        filter="image"
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FontSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-white/65">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
      >
        {options.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-white/65">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-white/10"
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] font-mono text-white"
        />
      </div>
    </label>
  );
}

function MediaPicker({
  label,
  name,
  value,
  onChange,
  onOpenPicker,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onOpenPicker: () => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-white/65">{label}</span>
      <div className="flex items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-9 w-9 rounded border border-white/10 bg-black/40 object-contain"
            referrerPolicy="no-referrer"
          />
        )}
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white"
        />
        <button
          type="button"
          onClick={onOpenPicker}
          className="rounded-md border border-orange/40 bg-orange/10 px-3 py-2 text-[12px] font-medium text-orange hover:bg-orange/20"
        >
          {value ? "Cambiar" : "Elegir"}
        </button>
      </div>
    </label>
  );
}

function Preview({ state }: { state: Initial }) {
  return (
    <div className="lg sticky top-6 self-start rounded-2xl p-6">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/55">
        Vista previa
      </h3>
      <div
        className="rounded-2xl p-6"
        style={{
          background: state.colorBg,
          color: state.colorText,
          fontFamily: `'${state.fontBody}', sans-serif`,
        }}
      >
        <div
          className="mb-1 text-[11px] font-mono"
          style={{ color: state.colorPrimary }}
        >
          // ejemplo de etiqueta
        </div>
        <div
          className="italic"
          style={{
            fontFamily: `'${state.fontHeading}', serif`,
            fontSize: 36,
            lineHeight: 1.05,
            letterSpacing: "-1px",
          }}
        >
          Narrativa que viaja
        </div>
        <p className="mt-3 text-[14px]" style={{ opacity: 0.75 }}>
          Este es un párrafo de cuerpo. Cambia las fuentes y colores arriba para
          ver cómo afectan tu sitio.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white"
            style={{ background: state.colorPrimary }}
          >
            Botón primario
          </button>
          <button
            type="button"
            className="rounded-full border px-4 py-2 text-[13px] font-medium text-white"
            style={{ borderColor: state.colorAccent, color: state.colorAccent }}
          >
            Botón secundario
          </button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/40">
        ⚠️ Vista previa local. Para ver el cambio en la web pública, guarda y
        recarga la home.
      </p>
    </div>
  );
}
