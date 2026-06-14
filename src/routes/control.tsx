import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/control")({
  component: ControlPage,
  head: () => ({ meta: [{ title: "Control - Apple Platform" }] }),
});

const SYSTEM_PASSWORD = "202122";

function ControlPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<1 | 2>(1);
  const [sysPass, setSysPass] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  function checkSystem(e: React.FormEvent) {
    e.preventDefault();
    if (sysPass === SYSTEM_PASSWORD) {
      setStage(2);
      toast.success("Acceso al sistema autorizado");
    } else {
      toast.error("Contraseña de sistema incorrecta");
    }
  }

  async function adminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let email = user.trim();
    let pwd = pass;
    if (email.toUpperCase() === "J35U5HD" && pwd === "33550892Jesus") {
      try { await bootstrapAdmin(); } catch (err) { console.warn(err); }
      email = "j35u5hd@apple.platform";
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) { setLoading(false); return toast.error("Credenciales inválidas"); }
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      if (roles?.some((r) => r.role === "admin")) {
        navigate({ to: "/admin" });
        return;
      }
    }
    setLoading(false);
    await supabase.auth.signOut();
    toast.error("Esta cuenta no tiene rol de administrador");
  }

  return (
    <div className="min-h-screen bg-background px-6 pb-10 pt-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-foreground text-3xl text-background">🔐</div>
          <h1 className="text-2xl font-semibold tracking-tight">{stage === 1 ? "Acceso al Sistema" : "Inicio de Administrador"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stage === 1 ? "Ingresa la contraseña de acceso" : "Valida tu rol de administrador"}
          </p>
        </div>

        {stage === 1 ? (
          <form onSubmit={checkSystem} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Contraseña de Acceso al Sistema</span>
              <input
                type="password"
                value={sysPass}
                onChange={(e) => setSysPass(e.target.value)}
                autoFocus
                className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base tracking-widest outline-none focus:border-primary"
              />
            </label>
            <button type="submit" className="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-medium text-primary-foreground active:scale-[0.98]">
              Validar
            </button>
            <button type="button" onClick={() => navigate({ to: "/account" })} className="w-full pt-2 text-center text-sm text-muted-foreground">
              Cancelar
            </button>
          </form>
        ) : (
          <form onSubmit={adminLogin} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Usuario</span>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoFocus
                className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Contraseña</span>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none focus:border-primary"
              />
            </label>
            <button disabled={loading} type="submit" className="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-50">
              {loading ? "Validando…" : "Entrar al Panel"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
