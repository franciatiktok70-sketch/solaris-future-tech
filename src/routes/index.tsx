import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
  ssr: false,
});

const MAINTENANCE_PASSWORD = "33550892Jesus";
const STORAGE_KEY = "maintenance_unlocked";

function IndexRedirect() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1") {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace("/home");
      else window.location.replace("/register");
    });
  }, [unlocked]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password === MAINTENANCE_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError("Contraseña incorrecta");
    }
  }

  if (checking || unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-sm text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-foreground text-2xl text-background">
          ⚙️
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Plataforma en actualización</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La plataforma está siendo actualizada en este momento. Por favor, intente más tarde.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3 text-left">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Contraseña de acceso
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
              placeholder="Ingresa la contraseña"
            />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-primary py-3 text-base font-medium text-primary-foreground active:scale-[0.98]"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
