"use client";

import { useState, useId } from "react";
import { AssetPicker } from "./AssetPicker";

export type RowField = {
  key: string;
  label?: string;
  placeholder?: string;
  type?: "text" | "textarea" | "image" | "emoji";
  /** col-span 1-6 in the row grid (default 1) */
  span?: 1 | 2 | 3 | 4 | 5 | 6;
};

/** Emojis sugeridos para iconos (producción audiovisual + creatividad). */
const EMOJI_PRESETS = [
  "🎬", "🎥", "📷", "📸", "🎞️", "🎨", "✨", "🎭",
  "🎙️", "🔊", "🎵", "🎤", "💡", "⚡", "🚀", "🌟",
  "🔥", "💎", "🏆", "📈", "🎯", "🤖", "🧠", "💻",
  "📱", "🌐", "🖌️", "✂️", "🪄", "📺", "▶️", "🎪",
];

type Props = {
  /** Hidden input name; value will be JSON.stringify(rows) */
  name: string;
  defaultValue?: Record<string, string>[] | null;
  fields: RowField[];
  addLabel?: string;
  emptyHint?: string;
  /** Total grid columns per row (default sum of spans, capped at 6) */
  columns?: number;
};

export function RowsEditor({
  name,
  defaultValue,
  fields,
  addLabel = "+ Añadir fila",
  emptyHint,
  columns,
}: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    defaultValue && defaultValue.length > 0
      ? defaultValue.map((r) => normalizeRow(r, fields))
      : [],
  );

  const totalCols =
    columns ?? Math.min(6, fields.reduce((s, f) => s + (f.span ?? 1), 0));

  const addRow = () => {
    const empty: Record<string, string> = {};
    for (const f of fields) empty[f.key] = "";
    setRows((rs) => [...rs, empty]);
  };

  const removeRow = (idx: number) => {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  };

  const moveRow = (idx: number, dir: -1 | 1) => {
    setRows((rs) => {
      const next = [...rs];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return rs;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateRow = (idx: number, key: string, val: string) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  };

  const cleaned = rows
    .map((r) => {
      const out: Record<string, string> = {};
      for (const f of fields) {
        const v = (r[f.key] ?? "").trim();
        if (v) out[f.key] = v;
      }
      return out;
    })
    .filter((r) => Object.keys(r).length > 0);

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-[12px] text-white/45">
          {emptyHint ?? "Sin filas. Añade la primera abajo."}
        </div>
      )}

      {rows.map((row, idx) => (
        <Row
          key={idx}
          idx={idx}
          row={row}
          fields={fields}
          totalCols={totalCols}
          isFirst={idx === 0}
          isLast={idx === rows.length - 1}
          onUpdate={updateRow}
          onRemove={removeRow}
          onMove={moveRow}
        />
      ))}

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-md border border-dashed border-orange/30 px-3 py-2 text-[12px] font-medium text-orange/85 hover:border-orange/50 hover:bg-orange/5"
      >
        {addLabel}
      </button>

      <input type="hidden" name={name} value={JSON.stringify(cleaned)} />
    </div>
  );
}

function Row({
  idx,
  row,
  fields,
  totalCols,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: {
  idx: number;
  row: Record<string, string>;
  fields: RowField[];
  totalCols: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (idx: number, key: string, val: string) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  const gridCols =
    totalCols >= 5
      ? "md:grid-cols-6"
      : totalCols === 4
        ? "md:grid-cols-4"
        : totalCols === 3
          ? "md:grid-cols-3"
          : totalCols === 2
            ? "md:grid-cols-2"
            : "md:grid-cols-1";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className={`grid grid-cols-1 gap-2 ${gridCols}`}>
        {fields.map((f) => (
          <FieldCell
            key={f.key}
            field={f}
            value={row[f.key] ?? ""}
            onChange={(v) => onUpdate(idx, f.key, v)}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onMove(idx, -1)}
          disabled={isFirst}
          className="rounded border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          title="Subir"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(idx, 1)}
          disabled={isLast}
          className="rounded border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          title="Bajar"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="rounded border border-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
          title="Eliminar fila"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function FieldCell({
  field,
  value,
  onChange,
}: {
  field: RowField;
  value: string;
  onChange: (v: string) => void;
}) {
  const colSpanCls =
    field.span === 6
      ? "md:col-span-6"
      : field.span === 5
        ? "md:col-span-5"
        : field.span === 4
          ? "md:col-span-4"
          : field.span === 3
            ? "md:col-span-3"
            : field.span === 2
              ? "md:col-span-2"
              : "md:col-span-1";

  if (field.type === "image") {
    return (
      <div className={`flex flex-col gap-1 ${colSpanCls}`}>
        {field.label && (
          <span className="text-[10px] uppercase tracking-wider text-white/45">
            {field.label}
          </span>
        )}
        <InlineImageInput value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "emoji") {
    return (
      <div className={`flex flex-col gap-1 ${colSpanCls}`}>
        {field.label && (
          <span className="text-[10px] uppercase tracking-wider text-white/45">
            {field.label}
          </span>
        )}
        <EmojiInput value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={`flex flex-col gap-1 ${colSpanCls}`}>
        {field.label && (
          <span className="text-[10px] uppercase tracking-wider text-white/45">
            {field.label}
          </span>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white focus:border-orange/50 focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${colSpanCls}`}>
      {field.label && (
        <span className="text-[10px] uppercase tracking-wider text-white/45">
          {field.label}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white focus:border-orange/50 focus:outline-none"
      />
    </div>
  );
}

function EmojiInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[20px] hover:border-orange/40"
        title="Elegir emoji"
      >
        {value || "🙂"}
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="o pega un emoji"
        className="w-full min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white focus:border-orange/50 focus:outline-none"
      />
      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-11 z-20 grid w-[244px] grid-cols-8 gap-1 rounded-xl border border-white/10 bg-[#0f0f0f] p-2 shadow-2xl">
            {EMOJI_PRESETS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded text-[18px] hover:bg-white/10"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InlineImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="h-10 w-10 flex-shrink-0 rounded border border-white/10 object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-dashed border-white/15 text-[10px] text-white/35">
          —
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-orange/30 bg-orange/10 px-2 py-1.5 text-[11px] text-orange hover:bg-orange/15"
      >
        {value ? "Cambiar" : "Elegir"}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded border border-white/10 px-2 py-1.5 text-[11px] text-white/60 hover:bg-white/5"
        >
          ✕
        </button>
      )}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="o pega URL"
        className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-white/70 focus:border-orange/50 focus:outline-none"
      />
      <AssetPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(asset) => {
          onChange(asset.url);
          setOpen(false);
        }}
        filter="image"
      />
    </div>
  );
}

function normalizeRow(
  row: Record<string, unknown>,
  fields: RowField[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = row[f.key];
    out[f.key] = v == null ? "" : String(v);
  }
  return out;
}
