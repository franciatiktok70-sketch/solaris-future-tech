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
        .select("user_id")
        .eq("ip", ip)
        .not("user_id", "is", null)
        .limit(20);
      if (ipErr) throw new Error(ipErr.message);
      const ids = (prev ?? []).map((r) => r.user_id!).filter(Boolean);
      if (ids.length > 0) {
        const { data: stillThere } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .in("id", ids)
          .limit(1);
        if (stillThere && stillThere.length > 0) {
          throw new Error(
            "Ya existe una cuenta registrada desde este dispositivo o red. Solo se permite una cuenta por IP.",
          );
        }
        await supabaseAdmin.from("signup_ips").delete().eq("ip", ip);
      }
    }

    // Crear usuario ya confirmado (sin verificación por correo)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username,
        phone: data.phone,
        invitation_code: (data.invitation_code ?? "").toUpperCase() || null,
      },
    });
    if (createErr) throw new Error(createErr.message);

    const newUserId = created.user?.id ?? null;

    if (ip && newUserId) {
      await supabaseAdmin.from("signup_ips").insert({ user_id: newUserId, ip, user_agent: ua });
    }

    return { ok: true, email: data.email };
  });
