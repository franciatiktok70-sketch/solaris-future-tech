import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bs, VENEZUELA_BANKS } from "@/lib/format";

export const Route = createFileRoute("/_app/account")({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | "recharge" | "withdraw" | "movements" | "recharges" | "withdrawals" | "bank">(null);

  const meQ = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return { ...data, authEmail: user.email };
    },
  });

  const countQ = useQuery({
    queryKey: ["my-investments-count"],
    queryFn: async () => {
      const { count } = await supabase.from("investments").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function installPWA() {
    if ("serviceWorker" in navigator) toast.info("Pulsa 'Agregar a pantalla de inicio' en tu navegador");
    else toast.info("Tu navegador no soporta instalación");
  }

  const p = meQ.data;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-foreground px-5 pb-8 pt-6 text-background">
        <div className="text-sm opacity-80">{p?.authEmail ?? "—"}</div>
        <div className="text-xs opacity-60">ID: {p?.id?.slice(0, 8) ?? "—"}</div>
      </div>

      {/* Balance card */}
      <div className="-mt-6 px-5">
        <div className="rounded-3xl bg-card p-5 shadow-md">
          <div className="text-xs text-muted-foreground">Saldo de la cuenta</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{bs(p?.balance ?? 0)}</div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setModal("recharge")} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">Recargar</button>
            <button onClick={() => setModal("withdraw")} className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-medium text-background">Retirar</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <Stat label="Recargado" value={bs(p?.total_recharged ?? 0)} />
        <Stat label="Retirado" value={bs(p?.total_withdrawn ?? 0)} />
        <Stat label="Productos" value={String(countQ.data ?? 0)} />
      </div>

      {/* Grid */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        <GridBtn label="Monto detallado" onClick={() => setModal("movements")} icon="📊" />
        <GridBtn label="Recargas" onClick={() => setModal("recharges")} icon="💳" />
        <GridBtn label="Retiros" onClick={() => setModal("withdrawals")} icon="💸" />
        <GridBtn label="Cuenta de retiro" onClick={() => setModal("bank")} icon="🏦" />
        <GridBtn label="Descargar" onClick={installPWA} icon="⬇️" />
        <GridBtn label="Control" onClick={() => navigate({ to: "/control" })} icon="🔐" />
        <GridBtn label="Salir" onClick={logout} icon="🚪" />
      </div>

      {modal === "recharge" && <RechargeModal onClose={() => { setModal(null); qc.invalidateQueries(); }} />}
      {modal === "withdraw" && <WithdrawModal onClose={() => { setModal(null); qc.invalidateQueries(); }} />}
      {modal === "movements" && <ListModal title="Movimientos" type="movements" onClose={() => setModal(null)} />}
      {modal === "recharges" && <ListModal title="Recargas" type="recharges" onClose={() => setModal(null)} />}
      {modal === "withdrawals" && <ListModal title="Retiros" type="withdrawals" onClose={() => setModal(null)} />}
      {modal === "bank" && <BankModal onClose={() => setModal(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[10px] uppercase opacity-80">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function GridBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: string }) {
  return (
    <button onClick={onClick} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-card p-2 text-center shadow-sm active:scale-95">
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-primary">Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RechargeModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Monto inválido");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    let receiptUrl: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) { toast.error(upErr.message); setLoading(false); return; }
      receiptUrl = path;
    }
    const { error } = await supabase.from("recharge_requests").insert({ user_id: user.id, amount: amt, receipt_url: receiptUrl });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Solicitud enviada"); onClose(); }
  }
  return (
    <ModalShell title="Recargar" onClose={onClose}>
      <div className="space-y-3 rounded-2xl bg-card p-4 text-sm">
        <div className="font-medium">Datos para transferir</div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Titular: <strong className="text-foreground">Orlanda Ramírez Acosta</strong></div>
          <div>Banco: <strong className="text-foreground">Banco Venezolano de Crédito</strong></div>
          <div>Cuenta: <strong className="text-foreground">0104-0019-86-0190162931</strong></div>
          <div>Cédula: <strong className="text-foreground">8.634.091</strong></div>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Monto (Bs)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Captura del comprobante</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </label>
        <button disabled={loading} onClick={submit} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">{loading ? "Enviando…" : "Enviar solicitud"}</button>
      </div>
    </ModalShell>
  );
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [generatedPin, setGeneratedPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const banksQ = useQuery({
    queryKey: ["my-banks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("bank_accounts").select("*").eq("user_id", user.id);
      return data ?? [];
    },
  });
  const [bankId, setBankId] = useState("");

  const MIN = 1000;
  const FEE = 0.15;
  const amt = parseFloat(amount) || 0;
  const net = amt > 0 ? amt - amt * FEE : 0;
  const belowMin = amt > 0 && amt < MIN;

  async function requestPin() {
    if (amt < MIN) { setError(`El monto mínimo de retiro es de ${MIN} Bs.`); return; }
    setError(null);
    const { data, error: e } = await supabase.rpc("generate_withdrawal_pin");
    if (e) return toast.error(e.message);
    setGeneratedPin(String(data));
    setStep(2);
    toast.success("PIN generado, vence en 5 minutos");
  }

  async function submit() {
    if (amt < MIN) { setError(`El monto mínimo de retiro es de ${MIN} Bs.`); return; }
    setLoading(true);
    const { error: e } = await supabase.rpc("create_withdrawal", { _amount: amt, _bank_account_id: bankId, _pin: pin });
    setLoading(false);
    if (e) toast.error(e.message);
    else { toast.success("Retiro solicitado"); onClose(); }
  }

  return (
    <ModalShell title="Retirar" onClose={onClose}>
      {banksQ.data && banksQ.data.length === 0 ? (
        <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">Agrega primero una cuenta bancaria desde "Cuenta de retiro".</div>
      ) : step === 1 ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Monto (Bs) · mínimo 1.000</span>
            <input
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              type="number"
              min={MIN}
              className={`w-full rounded-2xl border bg-card px-4 py-3 ${belowMin || error ? "border-red-500" : "border-border"}`}
            />
            {amt > 0 && !belowMin && (
              <p className="mt-1.5 text-xs text-green-700">
                Monto neto a recibir: <strong>{bs(net)}</strong> (Comisión del 15% aplicada)
              </p>
            )}
            {(belowMin || error) && (
              <p className="mt-1.5 text-xs font-semibold text-red-600">
                {error ?? "El monto mínimo de retiro es de 1000 Bs."}
              </p>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Cuenta destino</span>
            <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="w-full rounded-2xl border border-border bg-card px-4 py-3">
              <option value="">Selecciona…</option>
              {banksQ.data?.map((b) => <option key={b.id} value={b.id}>{b.bank} · {b.holder_name}</option>)}
            </select>
          </label>
          <button disabled={!amount || !bankId || belowMin} onClick={requestPin} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">Generar PIN</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-primary/10 p-4 text-center">
            <div className="text-xs text-muted-foreground">PIN (demo, vence en 5 min)</div>
            <div className="mt-1 text-3xl font-bold tracking-widest text-primary">{generatedPin}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Enviado desde franciatiktok70@gmail.com</div>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Monto solicitado</span><span className="font-medium">{bs(amt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Comisión 15%</span><span className="font-medium text-red-600">−{bs(amt * FEE)}</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1"><span className="font-semibold">Neto a recibir</span><span className="font-bold text-green-700">{bs(net)}</span></div>
          </div>
          <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Introduce el PIN" className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-center text-xl tracking-widest" />
          <button disabled={loading} onClick={submit} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">{loading ? "Procesando…" : "Confirmar retiro"}</button>
        </div>
      )}
    </ModalShell>
  );
}

function BankModal({ onClose }: { onClose: () => void }) {
  const [bank, setBank] = useState("");
  const [holder, setHolder] = useState("");
  const [cedula, setCedula] = useState("");
  const [account, setAccount] = useState("");
  const [accountType, setAccountType] = useState("Ahorros");
  const qc = useQueryClient();
  const banksQ = useQuery({
    queryKey: ["my-banks-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("bank_accounts").select("*").eq("user_id", user.id);
      return data ?? [];
    },
  });
  async function save() {
    if (!bank || !holder || !cedula) return toast.error("Completa los campos");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("bank_accounts").insert({ user_id: user.id, bank, holder_name: holder, cedula, account_number: account, account_type: accountType } as any);
    if (error) toast.error(error.message);
    else { toast.success("Cuenta agregada"); setBank(""); setHolder(""); setCedula(""); setAccount(""); qc.invalidateQueries({ queryKey: ["my-banks-list"] }); qc.invalidateQueries({ queryKey: ["my-banks"] }); }
  }
  return (
    <ModalShell title="Cuentas de retiro" onClose={onClose}>
      <div className="mb-4 space-y-2">
        {banksQ.data?.map((b: any) => (
          <div key={b.id} className="rounded-2xl bg-card p-3 text-sm">
            <div className="font-medium">{b.bank} · <span className="text-xs text-muted-foreground">{b.account_type ?? "Ahorros"}</span></div>
            <div className="text-xs text-muted-foreground">{b.holder_name} · {b.cedula}</div>
            {b.account_number && <div className="text-xs text-muted-foreground">{b.account_number}</div>}
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <div className="text-sm font-semibold">Agregar cuenta</div>
        <select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
          <option value="">Banco…</option>
          {VENEZUELA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
          <option value="Ahorros">Cuenta de Ahorros</option>
          <option value="Corriente">Cuenta Corriente</option>
        </select>
        <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nombre completo del titular" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
        <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula / RIF" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Número de cuenta" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
        <button onClick={save} className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">Guardar</button>
      </div>
    </ModalShell>
  );
}

function ListModal({ title, type, onClose }: { title: string; type: "movements" | "recharges" | "withdrawals"; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["list", type],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      if (type === "movements") {
        const { data } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
        return data ?? [];
      }
      const table = type === "recharges" ? "recharge_requests" : "withdrawal_requests";
      const { data } = await supabase.from(table).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-2">
        {q.data && q.data.length > 0 ? q.data.map((r: any) => (
          <div key={r.id} className="rounded-xl bg-card p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{r.description ?? r.status ?? type}</span>
              <span className={Number(r.amount) >= 0 ? "text-primary" : "text-destructive"}>{bs(r.amount)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
          </div>
        )) : <p className="py-6 text-center text-sm text-muted-foreground">Sin registros</p>}
      </div>
    </ModalShell>
  );
}
