import { Link, useLocation } from "@tanstack/react-router";
import { Home, Share2, TrendingUp, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Inicio", icon: Home },
  { to: "/share", label: "Compartir", icon: Share2 },
  { to: "/earnings", label: "Ganancias", icon: TrendingUp },
  { to: "/account", label: "Cuenta", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map((t) => {
          const active = loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
