import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usd, bs, bsFromUsd, USD_TO_BS } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "recharges" | "withdrawals" | "users" | "devices" | "codes">("pending");

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
      <header className="flex items-center justify-between pb-3">
        <h1 className="text-xl font-semibold">Panel Solaris Admin</h1>
        <div className="flex gap-2">
          <a href="https://t.me/anonymousHD5" target="_blank" rel="noreferrer" className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">Telegram</a>
          <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Salir</button>
        </div>
      </header>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-primary/70 px-4 py-3 text-primary-foreground shadow-sm">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">Usuarios Reales</div>
          <div className="text-[10px] opacity-70">Total de cuentas registradas en la plataforma</div>
        </div>
        <div className="text-3xl font-bold tabular-nums">{usersQ.data?.length ?? "—"}</div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["pending", "recharges", "withdrawals", "users", "devices", "codes"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
            {t === "pending" ? "Solicitudes en Espera" : t === "recharges" ? "Recargas" : t === "withdrawals" ? "Retiros" : t === "users" ? "Usuarios" : t === "devices" ? "Dispositivos" : "Códigos"}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <PendingRechargesPanel
          requests={(rechargesQ.data ?? []).filter((r: any) => r.status === "pending")}
          onApprove={approveRecharge}
          onReject={rejectRecharge}
        />
      )}


      {tab === "recharges" && (
        <div className="space-y-2">
          {rechargesQ.data?.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{usd(r.amount)}</div>
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
        <div className="space-y-3">
          {withdrawalsQ.data?.length === 0 && (
            <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">No hay solicitudes</div>
          )}
          {withdrawalsQ.data?.map((r: any) => (
            <div key={r.id} className="rounded-2xl bg-card p-4 text-sm shadow-sm">
              <div className="flex items-start justify-between border-b border-border/60 pb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Usuario</div>
                  <div className="font-semibold">{r.user?.username ?? r.user_id.slice(0, 8)}</div>
                  {r.user?.email && <div className="text-[10px] text-muted-foreground">{r.user.email}</div>}
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Solicitado</div>
                  <div className="text-lg font-bold text-foreground">{usd(r.amount)}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Neto a transferir</div>
                  <div className="text-sm font-semibold text-green-700">{usd(r.net_amount ?? (r.amount - 1))}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${r.status === "pending" ? "bg-yellow-100 text-yellow-800" : r.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{r.status}</span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-secondary/60 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Datos Bancarios del Usuario</div>
                {r.bank ? (
                  <dl className="grid grid-cols-3 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Banco</dt>
                    <dd className="col-span-2 font-medium">{r.bank.bank}</dd>
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd className="col-span-2 font-medium">{r.bank.account_type ?? "Ahorros"}</dd>
                    <dt className="text-muted-foreground">Titular</dt>
                    <dd className="col-span-2 font-medium">{r.bank.holder_name}</dd>
                    <dt className="text-muted-foreground">Cédula / RIF</dt>
                    <dd className="col-span-2 font-medium">{r.bank.cedula}</dd>
                    <dt className="text-muted-foreground">Nº Cuenta</dt>
                    <dd className="col-span-2 font-mono font-medium tracking-wide">{r.bank.account_number}</dd>
                  </dl>
                ) : (
                  <div className="text-xs text-destructive">El usuario no registró cuenta bancaria</div>
                )}
              </div>

              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approveWithdrawal(r.id)}
                    className="flex-1 rounded-full bg-green-600 py-2.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-green-700"
                  >
                    ✓ Aceptar
                  </button>
                  <button
                    onClick={() => setRejectTarget(r)}
                    className="flex-1 rounded-full bg-red-600 py-2.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-red-700"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}

          {rejectTarget && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setRejectTarget(null)}>
              <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold">Rechazar solicitud</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Se devolverán <span className="font-semibold text-foreground">{usd(rejectTarget.amount)}</span> al balance de{" "}
                  <span className="font-semibold text-foreground">{rejectTarget.user?.username ?? "usuario"}</span> y la transacción quedará marcada como rechazada.
                </p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setRejectTarget(null)} className="flex-1 rounded-full bg-secondary py-2.5 text-xs font-medium">Cancelar</button>
                  <button
                    onClick={async () => { await rejectWithdrawal(rejectTarget.id); setRejectTarget(null); }}
                    className="flex-1 rounded-full bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Confirmar Rechazo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "users" && <UsersControlPanel users={usersQ.data ?? []} allUsers={usersQ.data ?? []} />}
      {tab === "devices" && <DevicesPanel />}
      {tab === "codes" && <GiftCodesPanel />}
    </div>
  );
}

function UsersControlPanel({ users, allUsers }: { users: any[]; allUsers: any[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = users.filter((u: any) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (u.username ?? "").toLowerCase().includes(s)
      || (u.email ?? "").toLowerCase().includes(s)
      || u.id.toLowerCase().includes(s);
  });

  const txQ = useQuery({
    queryKey: ["admin-user-tx", selected?.id],
    enabled: !!selected,
    queryFn: async () => (await supabase.rpc("admin_user_transactions", { _user_id: selected.id })).data ?? [],
  });

  async function adjust(sign: 1 | -1) {
    const v = parseFloat(delta);
    if (!v || v <= 0) return toast.error("Monto inválido");
    setBusy(true);
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: selected.id, _delta: sign * v, _note: note });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(sign > 0 ? "Saldo sumado" : "Saldo restado"); setDelta(""); setNote(""); qc.invalidateQueries(); }
  }

  async function resetPassword() {
    if (newPwd.length < 6) return toast.error("Mínimo 6 caracteres");
    setBusy(true);
    try {
      const { adminResetPassword } = await import("@/lib/admin-tools.functions");
      await adminResetPassword({ data: { userId: selected.id, newPassword: newPwd } });
      toast.success("Contraseña restablecida");
      setNewPwd("");
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, correo o ID…"
        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <div className="space-y-2">
        {filtered.map((u: any) => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className="block w-full rounded-2xl bg-card p-3 text-left text-sm active:scale-[0.99]"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{u.username}</div>
                <div className="text-[10px] text-muted-foreground">{u.email}</div>
                <div className="text-[10px] text-muted-foreground">Código: {u.invitation_code}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{usd(u.balance)}</div>
                <div className="text-[10px] text-muted-foreground">↑{usd(u.total_recharged)}</div>
                <div className="text-[10px] text-muted-foreground">↓{usd(u.total_withdrawn)}</div>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">Sin resultados</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Control de usuario</h2>
              <button onClick={() => setSelected(null)} className="text-sm text-primary">Cerrar</button>
            </div>

            <div className="rounded-2xl bg-card p-4 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Nombre</div>
                  <div className="font-semibold">{selected.username}</div>
                  <div className="text-xs text-muted-foreground">{selected.email}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">ID: {selected.id}</div>
                  <div className="text-[10px] text-muted-foreground">Código: {selected.invitation_code}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">Saldo actual</div>
                  <div className="text-2xl font-bold tabular-nums">{usd(selected.balance)}</div>
                  <div className="text-[10px] text-muted-foreground">↑{usd(selected.total_recharged)} · ↓{usd(selected.total_withdrawn)}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-card p-4 text-sm">
              <div className="mb-2 font-semibold">Ajustar saldo</div>
              <input value={delta} onChange={(e) => setDelta(e.target.value)} type="number" placeholder="Monto en Bs" className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo (opcional)" className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => adjust(1)} className="flex-1 rounded-full bg-green-600 py-2.5 text-xs font-semibold text-white disabled:opacity-50">+ Sumar</button>
                <button disabled={busy} onClick={() => adjust(-1)} className="flex-1 rounded-full bg-red-600 py-2.5 text-xs font-semibold text-white disabled:opacity-50">− Restar</button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-card p-4 text-sm">
              <div className="mb-1 font-semibold">Credenciales</div>
              <div className="mb-2 text-[11px] text-muted-foreground">La contraseña está encriptada. Restablécela aquí (mín. 6 caracteres).</div>
              <div className="flex gap-2">
                <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} type="text" placeholder="Nueva contraseña" className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                <button disabled={busy} onClick={resetPassword} className="rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50">Restablecer</button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-card p-4 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Red de Referidos (Invitados)</div>
                {(() => {
                  const refs = allUsers.filter((u: any) => u.referred_by === selected.id);
                  const total = refs.reduce((s: number, u: any) => s + Number(u.total_recharged ?? 0), 0);
                  return (
                    <div className="text-[10px] text-muted-foreground">
                      {refs.length} directos · ↑{usd(total)}
                    </div>
                  );
                })()}
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {(() => {
                  const refs = allUsers.filter((u: any) => u.referred_by === selected.id);
                  if (!refs.length) return <div className="py-4 text-center text-xs text-muted-foreground">Este usuario aún no tiene referidos</div>;
                  return refs.map((u: any) => (
                    <div key={u.id} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                      <div>
                        <div className="font-medium">{u.username}</div>
                        <div className="text-[10px] text-muted-foreground">{u.email}</div>
                        <div className="text-[10px] text-muted-foreground">Código: {u.invitation_code} · {new Date(u.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">{usd(u.balance)}</div>
                        <div className="text-[10px] text-muted-foreground">↑{usd(u.total_recharged)}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-card p-4 text-sm">
              <div className="mb-2 font-semibold">Historial de movimientos</div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {txQ.data?.length ? txQ.data.map((t: any) => (
                  <div key={t.id} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                    <div>
                      <div className="font-medium">{t.kind}</div>
                      <div className="text-[10px] text-muted-foreground">{t.description}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`font-semibold tabular-nums ${Number(t.amount) >= 0 ? "text-green-700" : "text-red-600"}`}>{usd(t.amount)}</div>
                  </div>
                )) : <div className="py-4 text-center text-xs text-muted-foreground">Sin movimientos</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DevicesPanel() {
  const qc = useQueryClient();
  const invQ = useQuery({
    queryKey: ["admin-investments"],
    queryFn: async () => (await supabase.rpc("admin_list_investments")).data ?? [],
  });
  async function forceExpire(id: string) {
    if (!confirm("¿Forzar expiración de este plan?")) return;
    const { error } = await supabase.rpc("admin_force_expire_investment", { _inv_id: id });
    if (error) toast.error(error.message); else { toast.success("Plan expirado"); qc.invalidateQueries({ queryKey: ["admin-investments"] }); }
  }
  async function activate(id: string) {
    if (!confirm("¿Activar manualmente este dispositivo (reinicia ciclo de 30 días)?")) return;
    const { error } = await supabase.rpc("admin_activate_investment", { _inv_id: id });
    if (error) toast.error(error.message); else { toast.success("Plan activado"); qc.invalidateQueries({ queryKey: ["admin-investments"] }); }
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Dispositivos arrendados por los usuarios. Ciclo: 30 días · ROI: 5% diario.</div>
      {invQ.data?.length === 0 && <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">Sin dispositivos arrendados</div>}
      {invQ.data?.map((i: any) => (
        <div key={i.id} className="rounded-2xl bg-card p-3 text-sm shadow-sm">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">{i.plan_name}</div>
              <div className="text-[10px] text-muted-foreground">{i.username} · {i.email}</div>
              <div className="text-[10px] text-muted-foreground">ID: {i.user_id.slice(0,8)}</div>
              <div className="text-[10px] text-muted-foreground">Compra: {new Date(i.purchased_at).toLocaleDateString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">Días restantes</div>
              <div className={`text-lg font-bold ${i.active && i.days_remaining > 0 ? "text-green-700" : "text-red-600"}`}>{i.days_remaining}</div>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${i.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{i.active ? "Activo" : "Expirado"}</span>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {i.active ? (
              <button onClick={() => forceExpire(i.id)} className="flex-1 rounded-full bg-red-600 py-2 text-xs font-semibold text-white">Forzar expiración</button>
            ) : (
              <button onClick={() => activate(i.id)} className="flex-1 rounded-full bg-green-600 py-2 text-xs font-semibold text-white">Activar manualmente</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GiftCodesPanel() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const codesQ = useQuery({
    queryKey: ["gift-codes"],
    queryFn: async () => (await supabase.from("gift_codes").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function create() {
    const a = parseFloat(amount); const l = parseInt(limit);
    if (!a || a <= 0) return toast.error("Monto inválido");
    if (!l || l <= 0) return toast.error("Límite inválido");
    setBusy(true);
    const { error } = await supabase.rpc("admin_create_gift_code", { _code: code, _amount: a, _claim_limit: l });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Código creado"); setCode(""); setAmount(""); setLimit(""); qc.invalidateQueries({ queryKey: ["gift-codes"] }); }
  }
  async function editLimit(id: string, current: number) {
    const v = prompt("Nuevo límite de usos:", String(current));
    if (!v) return;
    const n = parseInt(v);
    if (!n || n <= 0) return toast.error("Límite inválido");
    const { error } = await supabase.rpc("admin_update_gift_code_limit", { _code_id: id, _new_limit: n });
    if (error) toast.error(error.message); else { toast.success("Límite actualizado"); qc.invalidateQueries({ queryKey: ["gift-codes"] }); }
  }
  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.rpc("admin_toggle_gift_code", { _code_id: id, _active: !active });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["gift-codes"] });
  }
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card p-4 text-sm">
        <div className="mb-2 font-semibold">Generar nuevo código</div>
        <div className="space-y-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código (opcional, se autogenera)" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono uppercase" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Monto en Bs (p.ej. 20)" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
          <input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" placeholder="Límite de usuarios (p.ej. 5)" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
          <button disabled={busy} onClick={create} className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Generar código</button>
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground">Códigos existentes</div>
      {codesQ.data?.length === 0 && <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">Aún no hay códigos</div>}
      {codesQ.data?.map((c: any) => {
        const reached = c.claims_count >= c.claim_limit;
        return (
          <div key={c.id} className="rounded-2xl bg-card p-3 text-sm shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-base font-bold tracking-wider">{c.code}</div>
                <div className="text-[10px] text-muted-foreground">{usd(c.amount)} · creado {new Date(c.created_at).toLocaleDateString()}</div>
                <div className="mt-1 text-xs">Usos: <strong>{c.claims_count}</strong> / {c.claim_limit}</div>
                {reached && <div className="mt-1 text-[10px] font-semibold text-red-600">Este código ha alcanzado el límite máximo de usos</div>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.active && !reached ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {c.active && !reached ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => editLimit(c.id, c.claim_limit)} className="flex-1 rounded-full bg-secondary py-1.5 text-xs">Editar límite</button>
              <button onClick={() => toggle(c.id, c.active)} className="flex-1 rounded-full bg-foreground py-1.5 text-xs text-background">{c.active ? "Desactivar" : "Reactivar"}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PendingRechargesPanel({ requests, onApprove, onReject }: { requests: any[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!requests.length) {
    return <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">No hay solicitudes en espera</div>;
  }
  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="rounded-2xl bg-card p-4 text-sm shadow-sm">
          <div className="flex items-start justify-between border-b border-border/60 pb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Solicitud</div>
              <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">User: {r.user_id.slice(0, 8)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Monto (USD)</div>
              <div className="text-lg font-bold text-foreground">{usd(r.amount ?? 0)}</div>
              <span className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-800">Pendiente</span>
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <ReceiptThumb path={r.receipt_url} onOpen={setLightbox} />
            <dl className="flex-1 grid grid-cols-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Cédula</dt>
              <dd className="col-span-2 font-medium">{r.cedula ?? "—"}</dd>
              <dt className="text-muted-foreground">Titular</dt>
              <dd className="col-span-2 font-medium">{r.holder_name ?? "—"}</dd>
              <dt className="text-muted-foreground">Referencia</dt>
              <dd className="col-span-2 font-mono font-medium">{r.reference ?? "—"}</dd>
            </dl>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => onApprove(r.id)} className="flex-1 rounded-full bg-green-600 py-2.5 text-xs font-semibold text-white hover:bg-green-700">✓ Aceptar</button>
            <button onClick={() => onReject(r.id)} className="flex-1 rounded-full bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700">✕ Rechazar</button>
          </div>
        </div>
      ))}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Comprobante" className="max-h-[90vh] max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}

function ReceiptThumb({ path, onOpen }: { path: string | null; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) return;
    supabase.storage.from("receipts").createSignedUrl(path, 600).then(({ data }) => {
      if (active && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  if (!path) return <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-secondary text-[10px] text-muted-foreground">Sin imagen</div>;
  if (!url) return <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-secondary" />;
  return (
    <button onClick={() => onOpen(url)} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary active:scale-95">
      <img src={url} alt="Comprobante" className="h-full w-full object-cover" />
    </button>
  );
}
