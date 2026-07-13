import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usd, bsFromUsd } from "@/lib/format";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const plansQ = useQuery({
    queryKey: ["plans-visible"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("hidden", false)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const fundQ = useQuery({
    queryKey: ["fund"],
    queryFn: async () => {
      const { data } = await supabase.from("community_fund").select("total").eq("id", 1).single();
      return Number(data?.total ?? 0);
    },
    refetchInterval: 8000,
  });

  const [liveCount, setLiveCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLiveCount((c) => c + Math.random() * 0.8 + 0.1), 1500);
    return () => clearInterval(t);
  }, []);

  async function purchase(planId: string, name: string) {
    const { error } = await supabase.rpc("purchase_plan", { _plan_id: planId });
    if (error) toast.error(error.message);
    else toast.success(`${name} activado. Ganancias diarias iniciando…`);
  }

  const [giftOpen, setGiftOpen] = useState(false);

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4">
        <div>
          <div className="font-display text-xl font-bold tracking-tight text-foreground">Solaris</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-glow">Future Tech</div>
        </div>
        <div className="rounded-full glass-card px-3 py-1 text-[10px] text-muted-foreground">
          <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.85_0.22_145)] align-middle" />
          Red activa
        </div>
      </header>

      {/* Hero */}
      <div className="mx-5 glass-card rounded-3xl p-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-glow">Ganancias diarias</div>
        <div className="mt-1 font-display text-4xl font-bold text-neon">5%</div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Invierte en paneles solares tokenizados y recibe rendimientos automáticos cada 24 horas durante 30 días.
        </p>
      </div>

      {/* Redeem code */}
      <div className="mx-5">
        <button
          onClick={() => setGiftOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl glass-card px-4 py-3 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div className="text-left">
              <div className="text-sm font-semibold">Canjear código</div>
              <div className="text-[11px] text-muted-foreground">Ingresa tu código promocional</div>
            </div>
          </div>
          <span className="text-cyan-glow">›</span>
        </button>
      </div>

      {/* Community fund */}
      <div className="mx-5 glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fondo Comunitario</div>
            <div className="mt-1 font-display text-2xl font-semibold text-foreground tabular-nums">
              {usd((fundQ.data ?? 0) + liveCount)}
            </div>
            <div className="text-[10px] text-muted-foreground">≈ {bsFromUsd((fundQ.data ?? 0) + liveCount)}</div>
          </div>
          <div className="rounded-full bg-[oklch(0.85_0.22_145)]/15 px-3 py-1 text-xs font-medium text-neon">
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.85_0.22_145)] align-middle" />
            En vivo
          </div>
        </div>
        <div className="mt-3 overflow-hidden">
          <div className="flex animate-ticker gap-8 whitespace-nowrap text-[11px] text-muted-foreground">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-8">
                <span>+${(Math.random() * 30 + 5).toFixed(2)} recarga aprobada</span>
                <span>Panel Solar 200W activado</span>
                <span>Retiro procesado · ${(Math.random() * 40).toFixed(2)}</span>
                <span>Comisión nivel 1 pagada</span>
                <span>Nuevo inversionista registrado</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="px-5 pt-1">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-cyan-glow">Catálogo de Paneles</h2>
        <div className="grid gap-3">
          {plansQ.data?.map((p) => {
            const daily = Number(p.price) * Number(p.daily_profit_pct) / 100;
            return (
              <div key={p.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.35_0.12_260)] to-[oklch(0.25_0.08_260)] text-2xl glow-cyan">
                      ☀️
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-foreground">{p.name}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Ciclo: {p.cycle_days} días · {p.daily_profit_pct}% diario</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-black/25 p-3">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Inversión</div>
                    <div className="text-sm font-bold text-foreground tabular-nums">{usd(p.price)}</div>
                    <div className="text-[10px] text-muted-foreground">{bsFromUsd(p.price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground">Ganancia diaria</div>
                    <div className="text-sm font-bold text-neon tabular-nums">{usd(daily)}</div>
                    <div className="text-[10px] text-muted-foreground">{bsFromUsd(daily)}</div>
                  </div>
                </div>
                <button
                  onClick={() => purchase(p.id, p.name)}
                  className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground glow-cyan active:scale-95"
                >
                  Comprar Tecnología
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust badges footer */}
      <div className="mx-5 mt-4 flex flex-wrap items-center justify-center gap-2 pb-4">
        <TrustBadge label="SSL Secured" />
        <TrustBadge label="256-bit Encryption" />
        <TrustBadge label="Secure with BEP20" />
      </div>

      {giftOpen && <GiftCodeModal onClose={() => setGiftOpen(false)} />}
    </div>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full glass-card px-3 py-1 text-[10px] uppercase tracking-wide text-cyan-glow">
      🔒 {label}
    </span>
  );
}

function GiftCodeModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit() {
    const c = code.trim();
    if (!c) return toast.error("Introduce un código");
    setLoading(true);
    const { data, error } = await supabase.rpc("claim_gift_code", { _code: c });
    setLoading(false);
    if (error) {
      const m = error.message || "";
      if (/inválido/i.test(m)) toast.error("Código inválido");
      else if (/ya canjeaste/i.test(m)) toast.error("El código ya ha sido canjeado por usted");
      else if (/límite|desactivado/i.test(m)) toast.error("Este código ha alcanzado el límite máximo de usos");
      else toast.error(m);
      return;
    }
    toast.success(`¡Has recibido ${usd(Number(data))}!`);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="w-full glass-card rounded-t-3xl p-5 pb-8 sm:max-w-sm sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Canjear código</h2>
          <button onClick={onClose} className="text-sm text-cyan-glow">Cerrar</button>
        </div>
        <div className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ingresa tu código"
            className="w-full rounded-2xl glass-input px-4 py-3 text-center text-lg font-semibold tracking-widest uppercase outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground glow-cyan disabled:opacity-50"
          >
            {loading ? "Procesando…" : "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}
