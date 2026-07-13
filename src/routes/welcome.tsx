import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
    });
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center">
      <div className="w-full glass-card rounded-t-3xl p-6 pb-8 sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl glass-card animate-neon-pulse">
          <span className="text-3xl">☀️</span>
        </div>
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
          Bienvenido a Solaris Future Tech
        </h2>
        <p className="mt-3 text-center text-base font-semibold text-neon">Ganancias diarias del 5%</p>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span className="text-cyan-glow">Solaris Future Tech</span> es una plataforma de nueva generación
            enfocada en energía solar y economía descentralizada. Invierte en <strong className="text-foreground">
            paneles solares tokenizados</strong> y participa en la producción global de energía limpia mientras
            recibes rendimientos automáticos en dólares.
          </p>
          <p>
            Cada panel adquirido produce un rendimiento fijo del <strong className="text-neon">5% diario</strong> durante
            un ciclo optimizado de <strong className="text-foreground">30 días</strong>, acreditado
            automáticamente a tu balance cada 24 horas. Los fondos operan bajo estrictas normativas de
            control comercial y validación algorítmica.
          </p>
          <p>
            Nuestro programa de referidos de <strong className="text-foreground">5 niveles</strong> (10% · 5% · 3% ·
            2% · 1%) te permite construir una red rentable y expandir tu capital de forma segura. Retiro
            mínimo de <strong className="text-cyan-glow">$5.00 USD</strong> con una comisión fija de solo $1.00 USD.
          </p>
        </div>

        <button
          onClick={() => navigate({ to: "/home" })}
          className="mt-7 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground glow-cyan active:scale-[0.98]"
        >
          Entrar a la plataforma
        </button>
      </div>
    </div>
  );
}
