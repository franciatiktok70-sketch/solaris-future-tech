import { createServerFn } from "@tanstack/react-start";

// Bootstraps the master admin user once. Idempotent.
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ADMIN_EMAIL = "j35u5hd@apple.platform";
  const ADMIN_PASSWORD = "33550892Jesus";

  // Find user
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => u.email === ADMIN_EMAIL);

  if (!user) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { username: "J35U5HD" },
    });
    if (error) throw new Error(error.message);
    user = created.user!;
  }

  // Ensure admin role
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (!roles?.some((r) => r.role === "admin")) {
    await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: "admin" });
  }

  return { ok: true };
});
