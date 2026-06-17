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
        <p className="mt-3 text-center text-base font-medium text-primary">Ganancias diarias del 7%</p>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Esta plataforma fue fundada el <strong className="text-foreground">20 de mayo de 2026</strong> como un
            entorno tecnológico de simulación avanzada que integra el arrendamiento de dispositivos digitales con un
            motor de generación de rendimientos comerciales en tiempo real. Nuestro modelo de economía colaborativa
            permite a usuarios de todo el país participar de forma activa en la optimización de fondos de liquidez
            digital, eliminando intermediarios tradicionales y automatizando la distribución de beneficios de manera
            equitativa.
          </p>
          <p>
            Nuestro ecosistema combina inteligencia distribuida, validación algorítmica de transacciones y un robusto
            programa de referidos de cinco niveles, ofreciendo a cada inversionista un canal transparente, ágil y
            completamente auditable para expandir de forma segura su capital. Los fondos acumulados operan bajo
            estrictas normativas de control comercial, garantizando flujos estables para todos los miembros activos.
          </p>
          <p>
            Cada equipo tecnológico arrendado produce un rendimiento fijo del <strong className="text-foreground">7%
            diario</strong> durante un ciclo optimizado de <strong className="text-foreground">30 días</strong>,
            acreditado automáticamente al saldo disponible de tu cuenta cada 24 horas. Al finalizar este periodo, el
            ciclo se cierra de manera exitosa, permitiendo una rotación ágil y segura del capital invertido con un
            retiro mínimo accesible de tan solo 600 Bs.
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
