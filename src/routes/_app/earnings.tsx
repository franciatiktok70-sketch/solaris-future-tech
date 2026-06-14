import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bs } from "@/lib/format";

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

  // Live counter tick
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="space-y-4 px-5 pt-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mis Ganancias</h1>
        <p className="text-sm text-muted-foreground">Tus equipos trabajando 24/7</p>
      </header>

      {invQ.data && invQ.data.length > 0 ? (
        <div className="space-y-3">
          {invQ.data.map((inv: any) => {
            const hours = Math.floor((Date.now() - new Date(inv.purchased_at).getTime()) / 3600000);
            const daily = Number(inv.plan.price) * Number(inv.plan.daily_profit_pct) / 100;
            const earned = daily * inv.payouts_made;
            const progress = (inv.payouts_made / inv.plan.cycle_days) * 100;
            return (
              <div key={inv.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={inv.plan.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{inv.plan.name}</div>
                      <span className={`text-[10px] rounded-full px-2 py-0.5 ${inv.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {inv.active ? "Activo" : "Finalizado"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">Trabajando hace {hours} h</div>
                    <div className="text-xs text-muted-foreground">+{bs(daily)} / día · Ganado: {bs(earned)}</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Día {inv.payouts_made} / {inv.plan.cycle_days}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Aún no has arrendado ningún equipo.</p>
          <p className="mt-1 text-xs text-muted-foreground">Ve a Inicio para elegir un plan.</p>
        </div>
      )}
    </div>
  );
}
