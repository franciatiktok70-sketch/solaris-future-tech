import { type ReactNode } from "react";

// Mantenimiento desactivado: acceso libre a la plataforma.
export function MaintenanceGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
