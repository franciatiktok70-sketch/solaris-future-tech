import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { registerUser } from "@/lib/auth-otp.functions";
import { CountryCodeSelect, DEFAULT_COUNTRY } from "@/components/CountryCodeSelect";
import type { Country } from "@/lib/countries";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Registro — Solaris Future Tech" }] }),
});

function scorePassword(p: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (p.length >= 12 && /[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 1) return { score: 1, label: "Débil", color: "bg-red-500" };
  if (s === 2) return { score: 2, label: "Media", color: "bg-yellow-500" };
  return { score: 3, label: "Fuerte", color: "bg-[oklch(0.85_0.22_145)]" };
}

function RegisterPage() {
  const navigate = useNavigate();
  const submit = useServerFn(registerUser);
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setInvitationCode(ref.toUpperCase());
  }, []);

  const strength = scorePassword(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || !email || !phone) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("La contraseña debe tener 8+ caracteres, una mayúscula y un número");
      return;
    }
    const fullPhone = `+${country.dial}${phone.replace(/\D/g, "")}`;
    setLoading(true);
    try {
      await submit({
        data: {
          email: email.trim().toLowerCase(),
          password,
          username: username.trim(),
          phone: fullPhone,
          invitation_code: invitationCode.trim().toUpperCase() || null,
        },
      });
      sessionStorage.setItem("sft:pending_email", email.trim().toLowerCase());
      toast.success("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
      setTimeout(
        () => navigate({ to: "/verify", search: { email: email.trim().toLowerCase() } as never }),
        900,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-14">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl glass-card animate-neon-pulse">
            <span className="text-3xl">☀️</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-cyan-glow">Solaris Future Tech</p>
          <p className="mt-3 text-xs text-neon">
            🎁 Bono de bienvenida: <strong>$5.00 USD</strong> + Plan Debut activo
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Nombre de usuario" value={username} onChange={setUsername} placeholder="Tu nombre" />

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Teléfono</span>
            <div className="flex">
              <CountryCodeSelect value={country} onChange={setCountry} />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
                placeholder="Número"
                className="w-full rounded-r-2xl glass-input px-4 py-3.5 text-base outline-none focus:border-primary"
              />
            </div>
          </div>

          <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" />

          <div>
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Mín. 8 caracteres, una mayúscula y número"
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex h-1.5 gap-1">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className={`h-full flex-1 rounded-full ${strength.score >= n ? strength.color : "bg-white/10"}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Seguridad: <span className="font-semibold text-foreground">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          <Field
            label="Código de invitación"
            value={invitationCode}
            onChange={setInvitationCode}
            placeholder="(opcional)"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground glow-cyan transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Procesando…" : "Crear cuenta"}
          </button>

          <p className="pt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <button type="button" onClick={() => navigate({ to: "/login" })} className="font-semibold text-cyan-glow">
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl glass-input px-4 py-3.5 text-base outline-none focus:border-primary"
      />
    </label>
  );
}
