import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bs } from "@/lib/format";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

const banners = [
  "https://images.unsplash.com/photo-1592286927505-1def25115558?w=1200",
  "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200",
  "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200",
  "https://images.unsplash.com/photo-1574755393849-623942496936?w=1200",
];

function HomePage() {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setSlide((s) => (s + 1) % banners.length), 3500);
    return () => clearInterval(i);
  }, []);

  const plansQ = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
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
    refetchInterval: 5000,
  });

  const [liveCount, setLiveCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLiveCount((c) => c + Math.floor(Math.random() * 500) + 50), 1500);
    return () => clearInterval(t);
  }, []);

  async function purchase(planId: string, name: string) {
    const { error } = await supabase.rpc("purchase_plan", { _plan_id: planId });
    if (error) toast.error(error.message);
    else toast.success(`${name} arrendado correctamente`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4">
        <div className="text-xl font-semibold tracking-tight">Apple</div>
        <div className="text-xs text-muted-foreground">Inversiones diarias</div>
      </header>

      {/* Slider */}
      <div className="mx-5 overflow-hidden rounded-3xl">
        <div className="relative h-44 w-full">
          {banners.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                slide === i ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Community fund */}
      <div className="mx-5 rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Fondo Comunitario</div>
            <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
              {bs((fundQ.data ?? 0) + liveCount)}
            </div>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary align-middle" />
            En vivo
          </div>
        </div>
        <div className="mt-3 overflow-hidden">
          <div className="flex animate-ticker gap-8 whitespace-nowrap text-xs text-muted-foreground">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-8">
                <span>+{(Math.random() * 500 + 100).toFixed(0)} Bs recarga aprobada</span>
                <span>iPhone 11 arrendado</span>
                <span>Retiro procesado · {(Math.random() * 2000).toFixed(0)} Bs</span>
                <span>Comisión nivel 1 pagada</span>
                <span>Nuevo usuario registrado</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="px-5 pt-1">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Planes disponibles</h2>
        <div className="space-y-3">
          {plansQ.data?.map((p) => {
            const daily = Number(p.price) * Number(p.daily_profit_pct) / 100;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
                <img src={p.image_url ?? ""} alt={p.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Precio: {bs(p.price)}</div>
                  <div className="text-xs text-muted-foreground">Ganancia: {bs(daily)} / día</div>
                  <div className="text-xs text-muted-foreground">Ciclo: {p.cycle_days} días</div>
                </div>
                <button
                  onClick={() => purchase(p.id, p.name)}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
                >
                  Arrendar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
