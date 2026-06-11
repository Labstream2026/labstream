"use client";

import { useState } from "react";

/**
 * Editor visual de etiquetas: muestra cada tag como un "chip" con × para
 * quitarlo, y un campo para añadir (Enter o coma). Sustituye al input de texto
 * "separadas por coma", que era confuso para usuarios no técnicos.
 *
 * Guarda el valor como CSV en un input oculto (`name`), así el schema existente
 * (`tagsCsv`) y las vistas previas siguen funcionando sin cambios.
 */
export function TagInput({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string | string[] | null;
  placeholder?: string;
}) {
  const initial = Array.isArray(defaultValue)
    ? defaultValue
    : (defaultValue ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

  const [tags, setTags] = useState<string[]>(initial);
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
  };
  const commit = (raw: string) => {
    // Permite pegar "a, b, c" de una vez.
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(add);
    setInput("");
  };
  const remove = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 focus-within:border-orange/50">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded-full border border-orange/30 bg-orange/10 py-1 pl-2.5 pr-1 text-[12px] text-orange/90"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            aria-label={`Quitar ${t}`}
            className="flex h-4 w-4 items-center justify-center rounded-full text-orange/60 hover:bg-orange/20 hover:text-orange"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) commit(v);
          else setInput(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(input);
          } else if (e.key === "Backspace" && !input && tags.length > 0) {
            remove(tags[tags.length - 1]);
          }
        }}
        onBlur={() => {
          if (input.trim()) commit(input);
        }}
        placeholder={tags.length ? "Añadir otra…" : (placeholder ?? "Escribe y pulsa Enter…")}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-[13px] text-white outline-none placeholder:text-white/35"
      />
      <input type="hidden" name={name} value={tags.join(",")} />
    </div>
  );
}
