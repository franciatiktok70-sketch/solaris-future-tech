import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bs } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"recharges" | "withdrawals" | "users">("recharges");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate({ to: "/login" });
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!data?.some((r) => r.role === "admin")) navigate({ to: "/home" });
    })();
  }, [navigate]);

  const rechargesQ = useQuery({
    queryKey: ["admin-recharges"],
    queryFn: async () => (await supabase.from("recharge_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const withdrawalsQ = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (!reqs?.length) return [];
      const userIds = Array.from(new Set(reqs.map((r) => r.user_id)));
      const bankIds = Array.from(new Set(reqs.map((r) => r.bank_account_id).filter(Boolean) as string[]));
      const [{ data: users }, { data: banks }] = await Promise.all([
        supabase.from("profiles").select("id, username, email").in("id", userIds),
        bankIds.length
          ? supabase.from("bank_accounts").select("*").in("id", bankIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const uMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const bMap = new Map((banks ?? []).map((b: any) => [b.id, b]));
      return reqs.map((r) => ({ ...r, user: uMap.get(r.user_id), bank: bMap.get(r.bank_account_id) }));
    },
  });
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.rpc("admin_list_users")).data ?? [],
  });

  async function approveRecharge(id: string) {
    const { error } = await supabase.rpc("admin_approve_recharge", { _req_id: id });
    if (error) toast.error(error.message); else { toast.success("Aprobado"); qc.invalidateQueries(); }
  }
  async function rejectRecharge(id: string) {
    const { error } = await supabase.rpc("admin_reject_recharge", { _req_id: id });
    if (error) toast.error(error.message); else { toast.success("Rechazado"); qc.invalidateQueries(); }
  }
  async function approveWithdrawal(id: string) {
    const { error } = await supabase.rpc("admin_approve_withdrawal", { _req_id: id });
    if (error) toast.error(error.message); else { toast.success("Aprobado"); qc.invalidateQueries(); }
  }
  async function rejectWithdrawal(id: string) {
    const { error } = await supabase.rpc("admin_reject_withdrawal", { _req_id: id });
    if (error) toast.error(error.message); else { toast.success("Rechazado"); qc.invalidateQueries(); }
  }

  async function viewReceipt(path: string | null) {
    if (!path) return toast.info("Sin comprobante");
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-xl font-semibold">Panel Administrador</h1>
        <div className="flex gap-2">
          <a href="https://t.me/anonymousHD5" target="_blank" rel="noreferrer" className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">Telegram</a>
          <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Salir</button>
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        {(["recharges", "withdrawals", "users"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-2 text-xs font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
            {t === "recharges" ? "Recargas" : t === "withdrawals" ? "Retiros" : "Usuarios"}
          </button>
        ))}
      </div>

      {tab === "recharges" && (
        <div className="space-y-2">
          {rechargesQ.data?.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{bs(r.amount)}</div>
                  <div className="text-[10px] text-muted-foreground">user: {r.user_id.slice(0, 8)}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] ${r.status === "pending" ? "bg-yellow-100 text-yellow-800" : r.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{r.status}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => viewReceipt(r.receipt_url)} className="rounded-full bg-secondary px-3 py-1 text-xs">Ver comprobante</button>
                {r.status === "pending" && <>
                  <button onClick={() => approveRecharge(r.id)} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Aprobar</button>
                  <button onClick={() => rejectRecharge(r.id)} className="rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground">Rechazar</button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "withdrawals" && (
        <div className="space-y-2">
          {withdrawalsQ.data?.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{bs(r.amount)}</div>
                  <div className="text-[10px] text-muted-foreground">user: {r.user_id.slice(0, 8)}</div>
                </div>
                <span className="h-fit rounded-full bg-secondary px-2 py-0.5 text-[10px]">{r.status}</span>
              </div>
              {r.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approveWithdrawal(r.id)} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Aprobar</button>
                  <button onClick={() => rejectWithdrawal(r.id)} className="rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground">Rechazar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {usersQ.data?.map((u: any) => (
            <div key={u.id} className="rounded-2xl bg-card p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{u.username}</div>
                  <div className="text-[10px] text-muted-foreground">{u.email}</div>
                  <div className="text-[10px] text-muted-foreground">Código: {u.invitation_code}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{bs(u.balance)}</div>
                  <div className="text-[10px] text-muted-foreground">↑{bs(u.total_recharged)}</div>
                  <div className="text-[10px] text-muted-foreground">↓{bs(u.total_withdrawn)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
