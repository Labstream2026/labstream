"use client";

import { useRef, useState } from "react";
import { AssetPicker } from "./AssetPicker";

type Props = {
  name: string;
  defaultValue?: string;
  rows?: number;
};

export function MarkdownEditor({ name, defaultValue = "", rows = 20 }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [showPreview, setShowPreview] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (before: string, after = before) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newValue =
      value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const insertAtLineStart = (prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue =
      value.slice(0, lineStart) + prefix + value.slice(lineStart);
    setValue(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const insertText = (text: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newValue = value.slice(0, start) + text + value.slice(end);
    setValue(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-white/10 bg-white/[0.04] p-2">
        <ToolBtn label="H2" onClick={() => insertAtLineStart("## ")} title="Subtítulo" />
        <ToolBtn label="H3" onClick={() => insertAtLineStart("### ")} title="Sub-subtítulo" />
        <Sep />
        <ToolBtn label="B" onClick={() => wrapSelection("**")} title="Negrita" bold />
        <ToolBtn label="I" onClick={() => wrapSelection("*")} title="Itálica" italic />
        <ToolBtn label="`</>`" onClick={() => wrapSelection("`")} title="Código inline" />
        <Sep />
        <ToolBtn label="• Lista" onClick={() => insertAtLineStart("- ")} />
        <ToolBtn label="1. Lista" onClick={() => insertAtLineStart("1. ")} />
        <ToolBtn label="❝ Cita" onClick={() => insertAtLineStart("> ")} />
        <Sep />
        <ToolBtn
          label="🔗 Link"
          onClick={() => wrapSelection("[", "](https://)")}
          title="Insertar link"
        />
        <ToolBtn
          label="🖼 Imagen"
          onClick={() => setPickerOpen(true)}
          title="Insertar imagen desde la biblioteca"
        />
        <Sep />
        <ToolBtn
          label={showPreview ? "Ocultar preview" : "Mostrar preview"}
          onClick={() => setShowPreview((v) => !v)}
        />
      </div>

      {/* Editor + preview */}
      <div className={`grid gap-2 ${showPreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          spellCheck={false}
          className="rounded-b-lg rounded-t-none border border-white/10 bg-white/[0.04] px-3 py-3 font-mono text-[13px] leading-relaxed text-white focus:border-orange/50 focus:outline-none"
          placeholder="## Empezamos con el tratamiento

Lorem ipsum…"
        />
        {showPreview && (
          <div
            className="overflow-y-auto rounded-b-lg rounded-t-none border border-white/10 bg-white/[0.02] px-5 py-4"
            style={{ maxHeight: `${rows * 1.6}em` }}
          >
            {value.trim() ? (
              <div
                className="prose-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
              />
            ) : (
              <p className="text-[12px] italic text-white/35">
                El preview aparece aquí. Empieza a escribir markdown.
              </p>
            )}
          </div>
        )}
      </div>

      <input type="hidden" name={name} value={value} />

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(asset) => {
          insertText(`![](${asset.url})`);
          setPickerOpen(false);
        }}
        filter="image"
      />

      <style>{`
        .prose-preview h1 { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; line-height: 1.1; color: #fff; margin: 1.5rem 0 0.75rem; }
        .prose-preview h2 { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 22px; line-height: 1.15; color: #fff; margin: 1.5rem 0 0.5rem; }
        .prose-preview h3 { font-size: 16px; font-weight: 600; color: #fff; margin: 1.25rem 0 0.5rem; }
        .prose-preview p { color: rgba(255,255,255,0.8); font-size: 13px; line-height: 1.7; margin-bottom: 0.85rem; }
        .prose-preview ul, .prose-preview ol { color: rgba(255,255,255,0.8); font-size: 13px; line-height: 1.7; margin: 0 0 0.85rem 1.25rem; }
        .prose-preview ul { list-style: disc; }
        .prose-preview ol { list-style: decimal; }
        .prose-preview li { margin-bottom: 0.25rem; }
        .prose-preview ul li::marker, .prose-preview ol li::marker { color: var(--orange); }
        .prose-preview a { color: var(--orange); text-decoration: underline; text-underline-offset: 3px; }
        .prose-preview code { background: rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 6px; font-family: ui-monospace,monospace; font-size: 90%; }
        .prose-preview blockquote { border-left: 2px solid rgba(232,100,12,0.5); padding-left: 1rem; font-family: 'Instrument Serif', serif; font-style: italic; color: rgba(255,255,255,0.85); font-size: 16px; margin: 1.25rem 0; }
        .prose-preview img { max-width: 100%; border-radius: 6px; margin: 0.75rem 0; }
        .prose-preview strong { color: #fff; font-weight: 600; }
        .prose-preview em { font-style: italic; }
      `}</style>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  title,
  bold,
  italic,
}: {
  label: string;
  onClick: () => void;
  title?: string;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`rounded border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/80 hover:bg-white/[0.08] hover:text-white ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}
    >
      {label}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-white/10" />;
}

// Markdown renderer — same dialect as /blog/[slug]/page.tsx
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(s: string) {
  let out = escapeHtml(s);
  // ![alt](url)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" referrerpolicy="no-referrer" />',
  );
  // [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const blocks: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    blocks.push(`<p>${renderInline(para.join(" "))}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }

    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      flushPara();
      blocks.push(`<h3>${renderInline(h3[1])}</h3>`);
      i++;
      continue;
    }

    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      flushPara();
      blocks.push(`<h2>${renderInline(h2[1])}</h2>`);
      i++;
      continue;
    }

    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1) {
      flushPara();
      blocks.push(`<h1>${renderInline(h1[1])}</h1>`);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+(.+)$/.test(lines[i])) {
        const m = /^\s*[-*]\s+(.+)$/.exec(lines[i]);
        if (m) items.push(`<li>${renderInline(m[1])}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+(.+)$/.test(lines[i])) {
        const m = /^\s*\d+\.\s+(.+)$/.exec(lines[i]);
        if (m) items.push(`<li>${renderInline(m[1])}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (/^>\s+/.test(line)) {
      flushPara();
      const m = /^>\s+(.+)$/.exec(line);
      if (m) blocks.push(`<blockquote>${renderInline(m[1])}</blockquote>`);
      i++;
      continue;
    }

    para.push(line);
    i++;
  }

  flushPara();
  return blocks.join("\n");
}
