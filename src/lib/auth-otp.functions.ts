import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido").max(255),
  password: z
    .string()
    .min(8, "Contraseña muy corta")
    .refine((p) => /[A-Z]/.test(p) && /[0-9]/.test(p), "Debe incluir mayúscula y número"),
  username: z.string().trim().min(2, "Nombre inválido").max(60),
  phone: z.string().trim().min(6, "Teléfono inválido").max(24),
  invitation_code: z.string().trim().max(16).optional().nullable(),
});

function readClientIp(): string | null {
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = getRequestHeader("x-real-ip");
  if (real) return real.trim();
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = readClientIp();
    const ua = getRequestHeader("user-agent") ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Anti multi-cuenta por IP
    if (ip) {
      const { data: prev, error: ipErr } = await supabaseAdmin
        .from("signup_ips")
        .select("id")
        .eq("ip", ip)
        .limit(1);
      if (ipErr) throw new Error(ipErr.message);
      if (prev && prev.length > 0) {
        throw new Error(
          "Ya existe una cuenta registrada desde este dispositivo o red. Solo se permite una cuenta por IP.",
        );
      }
    }

    // Crear usuario SIN confirmar (dispara email de confirmación con OTP)
    // Usamos el flujo público de signUp vía el SDK server-side con la clave publishable.
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const publicClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const { data: signup, error: signErr } = await publicClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          phone: data.phone,
          invitation_code: (data.invitation_code ?? "").toUpperCase() || null,
        },
      },
    });
    if (signErr) throw new Error(signErr.message);

    const newUserId = signup.user?.id ?? null;

    // Registrar IP (solo si tenemos user y ip)
    if (ip && newUserId) {
      await supabaseAdmin
        .from("signup_ips")
        .insert({ user_id: newUserId, ip, user_agent: ua });
    }

    return { ok: true, email: data.email };
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        token: z.string().trim().regex(/^\d{6}$/u, "Código inválido"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const publicClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { error } = await publicClient.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "signup",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resendSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email() }).parse(input),
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const publicClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { error } = await publicClient.auth.resend({ type: "signup", email: data.email });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
