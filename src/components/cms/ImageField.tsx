"use client";

import { useState } from "react";
import { AssetPicker } from "./AssetPicker";

type Props = {
  name: string;
  defaultValue?: string | null;
  label?: string;
  help?: string;
  required?: boolean;
  /** Filter for the picker */
  filter?: "image" | "video" | "any";
  /** Aspect of preview thumbnail */
  aspect?: "square" | "video" | "wide";
};

export function ImageField({
  name,
  defaultValue,
  label,
  help,
  required,
  filter = "image",
  aspect = "video",
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const aspectCls =
    aspect === "square"
      ? "aspect-square"
      : aspect === "wide"
        ? "aspect-[16/9]"
        : "aspect-video";

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          {label}
          {required && <span className="text-orange">*</span>}
        </span>
      )}

      <div className="flex items-stretch gap-3">
        {value ? (
          <div
            className={`group relative ${aspectCls} w-32 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setValue("")}
              className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              title="Quitar imagen"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className={`flex ${aspectCls} w-32 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/35`}
          >
            Sin imagen
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-md border border-orange/30 bg-orange/10 px-3 py-2 text-[12px] font-medium text-orange hover:bg-orange/15"
            >
              {value ? "Cambiar imagen" : "Elegir imagen"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/70 hover:bg-white/10"
              >
                Quitar
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrl((v) => !v)}
              className="rounded-md border border-white/10 px-3 py-2 text-[12px] text-white/55 hover:bg-white/5"
            >
              {showUrl ? "Ocultar URL" : "Editar URL manualmente"}
            </button>
          </div>

          {showUrl && (
            <input
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://…"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white focus:border-orange/50 focus:outline-none"
            />
          )}

          {help && <span className="text-[11px] text-white/40">{help}</span>}
        </div>
      </div>

      <input type="hidden" name={name} value={value} required={required} />

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(asset) => {
          setValue(asset.url);
          setPickerOpen(false);
        }}
        filter={filter}
      />
    </div>
  );
}
