import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; newPassword: string }) => {
    if (!input?.userId) throw new Error("userId requerido");
    if (!input?.newPassword || input.newPassword.length < 6)
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("No autorizado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });
