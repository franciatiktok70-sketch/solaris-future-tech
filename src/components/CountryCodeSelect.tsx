import { useMemo, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/lib/countries";

export function CountryCodeSelect({
  value,
  onChange,
}: {
  value: Country;
  onChange: (c: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.dial.includes(s) ||
        c.code.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-l-2xl glass-input border-r-0 px-3 py-3.5 text-sm hover:bg-white/5"
      >
        <span className="text-lg leading-none">{value.flag}</span>
        <span className="font-medium">+{value.dial}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-60">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full glass-card rounded-t-3xl p-4 pb-6 sm:max-w-md sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Selecciona país</h3>
              <button onClick={() => setOpen(false)} className="text-xl opacity-60">×</button>
            </div>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar país o código…"
              className="mb-3 w-full rounded-2xl glass-input px-4 py-3 text-sm outline-none"
            />
            <div className="max-h-[60vh] overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code + c.dial}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5"
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-muted-foreground">+{c.dial}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { DEFAULT_COUNTRY };
