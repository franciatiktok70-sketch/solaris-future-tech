import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Iniciar sesión — Solaris Future Tech" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Admin master shortcut: J35U5HD / 33550892Jesus
    let effectiveEmail = email.trim();
    const effectivePassword = password;
    if (effectiveEmail.toUpperCase() === "J35U5HD" && password === "33550892Jesus") {
      try {
        await bootstrapAdmin();
      } catch (e) {
        console.warn(e);
      }
      effectiveEmail = "j35u5hd@apple.platform";
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: effectiveEmail,
      password: effectivePassword,
    });
    setLoading(false);
    if (error) {
      toast.error("Credenciales inválidas");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (roles?.some((r) => r.role === "admin")) {
        navigate({ to: "/admin" });
        return;
      }
    }
    navigate({ to: "/welcome" });
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-16">
      <div className="mx-auto max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl glass-card animate-neon-pulse">
            <span className="text-3xl">☀️</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Solaris Future Tech</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-cyan-glow">Acceso seguro</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Correo electrónico</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-2xl glass-input px-4 py-3.5 text-base outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl glass-input px-4 py-3.5 text-base outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground glow-cyan transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Entrar"}
          </button>

          <p className="pt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <button type="button" onClick={() => navigate({ to: "/register" })} className="font-semibold text-cyan-glow">
              Regístrate
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
