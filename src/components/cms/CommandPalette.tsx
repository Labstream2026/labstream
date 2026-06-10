"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CommandRecord = {
  kind: "portfolio" | "blog" | "service" | "team" | "testimonial" | "lead";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

type StaticEntry = {
  id: string;
  label: string;
  href: string;
  group: string;
};

const STATIC_ENTRIES: StaticEntry[] = [
  { id: "nav-dashboard", label: "Dashboard", href: "/cms", group: "Navegar" },
  { id: "nav-leads", label: "Mensajes recibidos", href: "/cms/leads", group: "Navegar" },
  { id: "nav-pages", label: "Páginas", href: "/cms/pages", group: "Navegar" },
  { id: "nav-services", label: "Servicios", href: "/cms/services", group: "Navegar" },
  { id: "nav-portfolio", label: "Portafolio", href: "/cms/portfolio", group: "Navegar" },
  { id: "nav-blog", label: "Blog", href: "/cms/blog", group: "Navegar" },
  { id: "nav-about", label: "Acerca de", href: "/cms/about", group: "Navegar" },
  { id: "nav-team", label: "Equipo", href: "/cms/team", group: "Navegar" },
  { id: "nav-testimonials", label: "Testimonios", href: "/cms/testimonials", group: "Navegar" },
  { id: "nav-logos", label: "Logos cliente", href: "/cms/logos", group: "Navegar" },
  { id: "nav-faqs", label: "FAQs", href: "/cms/faqs", group: "Navegar" },
  { id: "nav-assets", label: "Medios", href: "/cms/assets", group: "Navegar" },
  { id: "nav-appearance", label: "Apariencia", href: "/cms/appearance", group: "Navegar" },
  { id: "nav-webapp", label: "Ir a la Webapp", href: "/app", group: "Navegar" },
];

const KIND_LABELS: Record<CommandRecord["kind"], string> = {
  portfolio: "Portafolio",
  blog: "Blog",
  service: "Servicio",
  team: "Miembro",
  testimonial: "Testimonio",
  lead: "Mensaje",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cmd/Ctrl+K toggles open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("/api/cms/search", window.location.origin);
        if (query.trim()) url.searchParams.set("q", query.trim());
        url.searchParams.set("limit", "5");
        const r = await fetch(url.toString());
        const data = await r.json();
        if (data.ok) setResults(data.results);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [query, open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  // Group dynamic results by kind
  const grouped = new Map<CommandRecord["kind"], CommandRecord[]>();
  for (const r of results) {
    const list = grouped.get(r.kind) ?? [];
    list.push(r);
    grouped.set(r.kind, list);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscador de comandos"
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[14vh] sm:pt-[10vh]"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <Command
        className="relative z-10 w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl"
        shouldFilter={false}
      >
        <div className="flex items-center gap-3 border-b border-white/8 px-4">
          <span className="text-[14px] text-white/40">⌘K</span>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Busca o navega…"
            className="flex-1 border-0 bg-transparent py-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none"
          />
          {loading && (
            <span className="text-[11px] text-white/40">Buscando…</span>
          )}
          <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/40">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-[13px] text-white/45">
            Sin resultados.
          </Command.Empty>

          {/* Static navigation entries */}
          <Command.Group
            heading="Navegar"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/35"
          >
            {STATIC_ENTRIES.filter((s) =>
              !query.trim()
                ? true
                : s.label.toLowerCase().includes(query.toLowerCase()),
            ).map((s) => (
              <Command.Item
                key={s.id}
                value={`nav-${s.label}`}
                onSelect={() => go(s.href)}
                className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[13px] text-white/85 aria-selected:bg-white/[0.07] aria-selected:text-white"
              >
                <span>{s.label}</span>
                <span className="text-[11px] text-white/35">{s.href}</span>
              </Command.Item>
            ))}
          </Command.Group>

          {[...grouped.entries()].map(([kind, items]) => (
            <Command.Group
              key={kind}
              heading={KIND_LABELS[kind]}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/35"
            >
              {items.map((r) => (
                <Command.Item
                  key={`${kind}-${r.id}`}
                  value={`${kind}-${r.title}-${r.id}`}
                  onSelect={() => go(r.href)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-[13px] aria-selected:bg-white/[0.07]"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-white">{r.title}</span>
                    {r.subtitle && (
                      <span className="truncate text-[11px] text-white/40">
                        {r.subtitle}
                      </span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[10px] uppercase tracking-widest text-orange/70">
                    {KIND_LABELS[kind]}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>

        <div className="border-t border-white/8 px-4 py-2.5 text-[11px] text-white/35">
          <kbd className="rounded border border-white/15 px-1.5 py-0.5">↑↓</kbd>{" "}
          navegar ·{" "}
          <kbd className="rounded border border-white/15 px-1.5 py-0.5">↵</kbd>{" "}
          abrir ·{" "}
          <kbd className="rounded border border-white/15 px-1.5 py-0.5">esc</kbd>{" "}
          cerrar
        </div>
      </Command>
    </div>
  );
}
