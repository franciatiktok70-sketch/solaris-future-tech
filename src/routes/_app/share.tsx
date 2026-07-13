import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/share")({
  component: SharePage,
});

const LEVELS = [
  { lvl: "Nivel 1", pct: "10%" },
  { lvl: "Nivel 2", pct: "5%" },
  { lvl: "Nivel 3", pct: "3%" },
  { lvl: "Nivel 4", pct: "2%" },
  { lvl: "Nivel 5", pct: "1%" },
];

function SharePage() {
  const meQ = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const refsQ = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("profiles")
        .select("username,email,created_at")
        .eq("referred_by", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const code = meQ.data?.invitation_code ?? "";
  const link = typeof window !== "undefined" && code ? `${window.location.origin}/register?ref=${code}` : "";
  const prettyLink = code ? `Solaris${code}.link` : "";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="space-y-4 px-5 pt-4">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Compartir & Ganar</h1>
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-glow">Programa de referidos · 5 niveles</p>
      </header>

      <div className="glass-card rounded-2xl p-4">
        <div className="mb-2 text-sm font-semibold">Comisiones por nivel</div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Cada vez que un miembro de tu red recargue saldo, recibes comisiones automáticas en tu balance.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {LEVELS.map((l) => (
            <div key={l.lvl} className="glass-card rounded-xl p-2 text-center">
              <div className="text-[10px] text-muted-foreground">{l.lvl}</div>
              <div className="text-sm font-bold text-neon">{l.pct}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card space-y-2 rounded-2xl p-4">
        <div className="text-xs text-muted-foreground">Código de invitación</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-xl bg-black/30 px-3 py-2.5 font-mono text-base font-semibold text-cyan-glow">{code || "—"}</div>
          <button onClick={() => copy(code, "Código")} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Copiar</button>
        </div>
        <div className="pt-2 text-xs text-muted-foreground">Enlace de referido</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-xl bg-black/30 px-3 py-2.5 font-mono text-sm font-semibold">{prettyLink}</div>
          <button onClick={() => copy(link, "Enlace")} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Copiar</button>
        </div>
        <div className="pt-1 text-[10px] text-muted-foreground">Al copiar se enviará el enlace directo de registro.</div>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <div className="mb-3 text-sm font-semibold">Mis referidos directos ({refsQ.data?.length ?? 0})</div>
        {refsQ.data && refsQ.data.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {refsQ.data.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.username}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Aún no tienes referidos.</p>
        )}
      </div>
    </div>
  );
}
