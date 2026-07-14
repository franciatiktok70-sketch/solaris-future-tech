import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import solarisLogo from "@/assets/solaris-logo.png.asset.json";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const logoUrl = `https://solaris-future-tech.lovable.app${solarisLogo.url}`;
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Solaris Future Tech — Energía solar y ganancias diarias" },
      { name: "description", content: "Solaris Future Tech: invierte en paneles solares de nueva generación y recibe ganancias diarias del 5% en USD. Seguridad de nivel bancario, retiros rápidos." },
      { name: "theme-color", content: "#0a1024" },
      { property: "og:title", content: "Solaris Future Tech" },
      { name: "twitter:title", content: "Solaris Future Tech" },
      { property: "og:description", content: "Invierte en paneles solares — 5% de ganancia diaria en USD. Seguridad máxima." },
      { name: "twitter:description", content: "Invierte en paneles solares — 5% de ganancia diaria en USD." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: logoUrl },
      { name: "twitter:image", content: logoUrl },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: solarisLogo.url },
      { rel: "shortcut icon", type: "image/png", href: solarisLogo.url },
      { rel: "apple-touch-icon", href: solarisLogo.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="mt-2 text-muted-foreground">Página no encontrada</p>
        <a href="/" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-primary-foreground">Inicio</a>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <p className="text-foreground">Ocurrió un error</p>
        <pre className="mt-2 max-w-md overflow-auto text-xs text-muted-foreground">{error.message}</pre>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
