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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Apple Platform" },
      { name: "description", content: "Plataforma de inversiones Apple" },
      { name: "theme-color", content: "#0071E3" },
      { property: "og:title", content: "Apple Platform" },
      { name: "twitter:title", content: "Apple Platform" },
      { property: "og:description", content: "Plataforma de inversiones Apple" },
      { name: "twitter:description", content: "Plataforma de inversiones Apple" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iSSBNgGdfbPs6cmuaIkc6uYaO3H3/social-images/social-1781465499215-1000364376.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iSSBNgGdfbPs6cmuaIkc6uYaO3H3/social-images/social-1781465499215-1000364376.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
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
