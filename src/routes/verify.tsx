import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { verifyEmailOtp, resendSignupOtp } from "@/lib/auth-otp.functions";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({ meta: [{ title: "Verifica tu correo — Solaris Future Tech" }] }),
});

function VerifyPage() {
  const navigate = useNavigate();
  const verifyFn = useServerFn(verifyEmailOtp);
  const resendFn = useServerFn(resendSignupOtp);
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const em = params.get("email") ?? sessionStorage.getItem("sft:pending_email") ?? "";
    if (!em) {
      navigate({ to: "/register" });
      return;
    }
    setEmail(em);
    sessionStorage.setItem("sft:pending_email", em);
    inputs.current[0]?.focus();
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const n = [...d];
      n[i] = clean;
      return n;
    });
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    const arr = ["", "", "", "", "", ""];
    for (let i = 0; i < txt.length; i++) arr[i] = txt[i]!;
    setDigits(arr);
    inputs.current[Math.min(txt.length, 5)]?.focus();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length !== 6) {
      toast.error("Ingresa el código completo de 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      await verifyFn({ data: { email, token } });
      sessionStorage.removeItem("sft:pending_email");
      await supabase.auth.signOut();
      toast.success("¡Cuenta verificada! Ya puedes iniciar sesión.");
      setTimeout(() => navigate({ to: "/login" }), 900);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido o vencido");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0) return;
    try {
      await resendFn({ data: { email } });
      toast.success("Nuevo código enviado");
      setCooldown(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reenviar el código");
    }
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-14">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl glass-card animate-neon-pulse">
            <span className="text-3xl">📩</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Verifica tu correo</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enviamos un código de 6 dígitos a
            <br />
            <span className="font-semibold text-foreground">{email || "…"}</span>
          </p>
        </div>

        <form onSubmit={onVerify} className="space-y-6">
          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                className="h-14 w-full rounded-2xl glass-input text-center text-2xl font-semibold outline-none focus:border-primary"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground glow-cyan transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Verificando…" : "Verificar cuenta"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            ¿No recibiste el código?{" "}
            <button
              type="button"
              onClick={onResend}
              disabled={cooldown > 0}
              className="font-semibold text-cyan-glow disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/register" })}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Cambiar correo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
