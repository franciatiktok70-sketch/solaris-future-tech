import { useState } from "react";

const SUPPORT_LINKS = [
  { label: "Soporte Técnico 1", url: "https://t.me/Soporte_SolarisTech_001" },
  { label: "Soporte Técnico 2", url: "https://t.me/Soporte_SolarisTech_002" },
];

export function SupportFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="pointer-events-auto flex w-56 flex-col gap-2 rounded-2xl glass-card p-3 shadow-xl">
          <div className="px-1 text-[10px] uppercase tracking-[0.2em] text-cyan-glow">Soporte Solaris</div>
          {SUPPORT_LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-foreground transition active:scale-95"
            >
              <span className="text-lg">💬</span>
              {l.label}
            </a>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label="Abrir soporte"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-2xl text-primary-foreground glow-cyan transition active:scale-95"
      >
        {open ? "✕" : "🎧"}
      </button>
    </div>
  );
}
