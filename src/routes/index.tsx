import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceGate } from "@/components/MaintenanceGate";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
  ssr: false,
});

function IndexRedirect() {
  return (
    <MaintenanceGate>
      <Redirector />
    </MaintenanceGate>
  );
}

function Redirector() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace("/home");
      else window.location.replace("/register");
    });
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground">Cargando…</div>
    </div>
  );
}
