import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Registro - Apple Platform" }] }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setInvitationCode(ref.toUpperCase());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || !email) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, invitation_code: invitationCode.trim().toUpperCase() || null },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Sign out immediately so the user must log in formally
    await supabase.auth.signOut();
    toast.success("Registro exitoso");
    setTimeout(() => navigate({ to: "/login" }), 1200);
  }

  return (
    <div className="min-h-screen bg-background px-6 pb-10 pt-16">
      <div className="mx-auto max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-foreground text-3xl text-background"></div>
          <h1 className="text-3xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plataforma de inversiones Apple</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Usuario" value={username} onChange={setUsername} placeholder="Tu nombre de usuario" />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
          <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" />
          <Field label="Código de invitación" value={invitationCode} onChange={setInvitationCode} placeholder="(opcional)" />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-primary py-3.5 text-base font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Procesando…" : "Aceptar"}
          </button>

          <p className="pt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <button type="button" onClick={() => navigate({ to: "/login" })} className="font-medium text-primary">
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none transition focus:border-primary"
      />
    </label>
  );
}
