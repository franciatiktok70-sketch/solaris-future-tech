import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usd, bsFromUsd } from "@/lib/format";

export const Route = createFileRoute("/_app/earnings")({
  component: EarningsPage,
});

function EarningsPage() {
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.rpc("process_due_payouts", { _user_id: user.id });
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["me-profile"] });
    })();
  }, [qc]);

  const invQ = useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("investments")
        .select("id, purchased_at, payouts_made, active, plan:plans(name, price, daily_profit_pct, cycle_days, image_url)")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });
      return data ?? [];
    },
  });

  // tick
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="space-y-4 px-5 pt-4">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Mis Paneles</h1>
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-glow">Producción 24/7</p>
      </header>

      {invQ.data && invQ.data.length > 0 ? (
        <div className="space-y-3">
          {invQ.data.map((inv: any) => {
            const hours = Math.floor((Date.now() - new Date(inv.purchased_at).getTime()) / 3600000);
            const daily = Number(inv.plan?.price ?? 0) * Number(inv.plan?.daily_profit_pct ?? 0) / 100;
            const earned = daily * inv.payouts_made;
            const cycle = inv.plan?.cycle_days ?? 30;
            const progress = (inv.payouts_made / cycle) * 100;
            return (
              <div key={inv.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.35_0.12_260)] to-[oklch(0.25_0.08_260)] text-2xl glow-cyan">
                    ☀️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-display font-semibold">{inv.plan?.name ?? "Plan"}</div>
                      <span className={`text-[10px] rounded-full px-2 py-0.5 ${inv.active ? "bg-[oklch(0.85_0.22_145)]/15 text-neon" : "bg-white/5 text-muted-foreground"}`}>
                        {inv.active ? "Activo" : "Finalizado"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Trabajando hace {hours} h</div>
                    <div className="text-[11px] text-muted-foreground">+{usd(daily)} / día · Ganado: <span className="text-neon">{usd(earned)}</span></div>
                    <div className="text-[10px] text-muted-foreground">≈ {bsFromUsd(daily)} / día</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-[oklch(0.85_0.22_145)] transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Día {inv.payouts_made} / {cycle}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Aún no has adquirido ningún panel solar.</p>
          <p className="mt-1 text-xs text-muted-foreground">Ve a Inicio y elige tu primera tecnología.</p>
        </div>
      )}
    </div>
  );
}
