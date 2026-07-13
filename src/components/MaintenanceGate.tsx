import { useEffect, useState, type ReactNode } from "react";

const MAINTENANCE_PASSWORD = "33550892Jesus";
const STORAGE_KEY = "maintenance_unlocked";

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1") {
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password === MAINTENANCE_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError("Contraseña incorrecta");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-6 py-12">
      <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl glass-card animate-neon-pulse">
          <span className="text-4xl">☀️</span>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Solaris Future Tech
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-cyan-glow">Sistema en mantenimiento</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          La plataforma no está disponible en este momento. Por favor, intente más tarde.
        </p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          className="w-full rounded-2xl glass-input px-4 py-3 text-base outline-none focus:border-primary"
          placeholder="Contraseña de administrador"
        />
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-3 text-base font-semibold text-primary-foreground active:scale-[0.98] glow-cyan"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
