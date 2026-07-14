import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Restablecer contraseña — Solaris Future Tech" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase envía el token en el hash; el SDK crea la sesión de recovery automáticamente.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Espera al evento PASSWORD_RECOVERY que el SDK dispara al procesar el hash.
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
        });
        setTimeout(() => setReady(true), 1200);
        return () => sub.subscription.unsubscribe();
      }
      setReady(true);
    };
    check();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    if (pw !== pw2) return toast.error("Las contraseñas no coinciden");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login" }), 800);
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl glass-card animate-neon-pulse">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Restablecer contraseña</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-cyan-glow">Solaris Future Tech</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">Verificando enlace…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Nueva contraseña</span>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-2xl glass-input px-4 py-3.5 text-base outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirmar contraseña</span>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="w-full rounded-2xl glass-input px-4 py-3.5 text-base outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground glow-cyan transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Confirmar cambio de contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
