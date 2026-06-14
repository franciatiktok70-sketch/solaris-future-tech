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
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center">
      <div className="w-full rounded-t-3xl bg-card p-6 pb-8 sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-foreground text-3xl text-background"></div>
        <h2 className="text-center text-2xl font-semibold tracking-tight">Bienvenido a la plataforma de Apple</h2>
        <p className="mt-3 text-center text-base font-medium text-primary">Ganancias diarias del 10%</p>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Esta plataforma fue fundada el <strong className="text-foreground">20 de mayo de 2026</strong> como un
            entorno tecnológico de simulación avanzada que integra arrendamiento de dispositivos digitales con un motor
            de generación de rendimientos en tiempo real.
          </p>
          <p>
            Nuestro ecosistema combina inteligencia distribuida, validación de transacciones en cadena y un programa
            de referidos de cinco niveles, ofreciendo a cada inversionista un canal transparente, ágil y auditable
            para hacer crecer su capital.
          </p>
          <p>
            Cada equipo arrendado produce un rendimiento del 10% diario durante un ciclo de 50 días, acreditado
            automáticamente al saldo de tu cuenta cada 24 horas.
          </p>
        </div>

        <button
          onClick={() => navigate({ to: "/home" })}
          className="mt-7 w-full rounded-full bg-primary py-3.5 text-base font-medium text-primary-foreground active:scale-[0.98]"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
