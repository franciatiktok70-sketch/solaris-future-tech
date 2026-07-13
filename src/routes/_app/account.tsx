import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usd, bs, bsFromUsd, USD_TO_BS, VENEZUELA_BANKS } from "@/lib/format";

export const Route = createFileRoute("/_app/account")({
  component: AccountPage,
});

type ModalKey = null | "recharge" | "withdraw" | "movements" | "recharges" | "withdrawals" | "bank";

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalKey>(null);

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

  const p = meQ.data;

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="glass-card mx-5 mt-4 rounded-3xl px-5 py-5">
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-glow">Solaris Future Tech</div>
        <div className="mt-1 text-sm font-medium text-foreground">{p?.username ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{p?.authEmail ?? "—"}</div>
        <div className="mt-4 text-[10px] uppercase tracking-wide text-muted-foreground">Saldo disponible</div>
        <div className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">{usd(p?.balance ?? 0)}</div>
        <div className="text-xs text-muted-foreground">≈ {bsFromUsd(p?.balance ?? 0)}</div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setModal("recharge")} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground glow-cyan">Recargar</button>
          <button onClick={() => setModal("withdraw")} className="flex-1 rounded-full border border-[oklch(0.85_0.22_145)] bg-transparent py-2.5 text-sm font-semibold text-neon">Retirar</button>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        <Stat label="Recargado" value={usd(p?.total_recharged ?? 0)} />
        <Stat label="Retirado" value={usd(p?.total_withdrawn ?? 0)} />
        <Stat label="Paneles" value={String(countQ.data ?? 0)} />
      </div>

      {/* Grid */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        <GridBtn label="Movimientos" onClick={() => setModal("movements")} icon="📊" />
        <GridBtn label="Recargas" onClick={() => setModal("recharges")} icon="💳" />
        <GridBtn label="Retiros" onClick={() => setModal("withdrawals")} icon="💸" />
        <GridBtn label="Cuenta de retiro" onClick={() => setModal("bank")} icon="🏦" />
        <GridBtn label="Control" onClick={() => navigate({ to: "/control" })} icon="🔐" />
        <GridBtn label="Cerrar sesión" onClick={logout} icon="🚪" />
      </div>

      {/* Contact / Community */}
      <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <a href="https://t.me/+Fb5-AlgBookyMDEx" target="_blank" rel="noreferrer" className="glass-card flex flex-col items-center gap-2 rounded-2xl p-4 text-center active:scale-95">
          <span className="text-3xl">💬</span>
          <span className="text-sm font-semibold leading-tight">Grupo Telegram</span>
          <span className="text-[10px] text-muted-foreground">Comunidad Oficial</span>
        </a>
        <a href="https://t.me/AppleSupportGlobal001" target="_blank" rel="noreferrer" className="glass-card flex flex-col items-center gap-2 rounded-2xl p-4 text-center active:scale-95">
          <span className="text-3xl">🎧</span>
          <span className="text-sm font-semibold leading-tight">Soporte Técnico</span>
          <span className="text-[10px] text-muted-foreground">Atención al Cliente</span>
        </a>
      </div>

      {/* Trust badges */}
      <div className="mx-5 mt-6 flex flex-wrap items-center justify-center gap-2">
        <TrustBadge>🔒 SSL Secured</TrustBadge>
        <TrustBadge>🛡 256-bit Encryption</TrustBadge>
        <TrustBadge>⚡ Secure with BEP20</TrustBadge>
      </div>

      {modal === "recharge" && <RechargeModal onClose={() => { setModal(null); qc.invalidateQueries(); }} />}
      {modal === "withdraw" && <WithdrawModal onClose={() => { setModal(null); qc.invalidateQueries(); }} />}
      {modal === "movements" && <ListModal title="Movimientos" type="movements" onClose={() => setModal(null)} />}
      {modal === "recharges" && <ListModal title="Historial de Recargas" type="recharges" onClose={() => setModal(null)} />}
      {modal === "withdrawals" && <ListModal title="Historial de Retiros" type="withdrawals" onClose={() => setModal(null)} />}
      {modal === "bank" && <BankModal onClose={() => setModal(null)} />}
    </div>
  );
}

function TrustBadge({ children }: { children: React.ReactNode }) {
  return <span className="glass-card rounded-full px-3 py-1 text-[10px] uppercase tracking-wide text-cyan-glow">{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl px-3 py-3 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function GridBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: string }) {
  return (
    <button onClick={onClick} className="glass-card flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-2 text-center active:scale-95">
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="glass-card max-h-[90vh] w-full overflow-y-auto rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-cyan-glow">Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("Copiado"); } catch { toast.error("No se pudo copiar"); } }}
      className="ml-2 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-semibold text-cyan-glow"
    >Copiar</button>
  );
}

function RechargeModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"bs" | "usdt">("bs");
  const MIN_BS = 5000;
  const MIN_USDT = 5;
  const [amount, setAmount] = useState("");
  const [cedula, setCedula] = useState("");
  const [holder, setHolder] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [wallet, setWallet] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const amt = parseFloat(amount) || 0;
  const min = tab === "bs" ? MIN_BS : MIN_USDT;
  const belowMin = amount !== "" && amt < min;
  const usdEquivalent = tab === "bs" ? amt / USD_TO_BS : amt;

  async function submit() {
    if (!amt || amt < min) return toast.error(tab === "bs" ? "El monto mínimo de depósito es de 5.000 Bs" : "El monto mínimo de depósito es de $5.00 USD");
    if (tab === "bs") {
      if (!cedula.trim()) return toast.error("La cédula es obligatoria");
      if (!holder.trim()) return toast.error("El nombre del titular es obligatorio");
      if (!reference.trim()) return toast.error("La referencia es obligatoria");
      if (!file) return toast.error("Debe subir la imagen del comprobante");
    } else {
      if (!wallet.trim()) return toast.error("Ingresa la dirección de billetera origen");
      if (!txHash.trim()) return toast.error("Ingresa el hash o TXID de la transacción");
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    let path: string | null = null;
    if (file) {
      const p = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(p, file);
      if (upErr) { toast.error(upErr.message); setLoading(false); return; }
      path = p;
    }
    // Store USD amount (converted from Bs when needed)
    const { error } = await supabase.from("recharge_requests").insert({
      user_id: user.id,
      amount: Number(usdEquivalent.toFixed(2)),
      receipt_url: path,
      cedula: tab === "bs" ? cedula.trim() : null,
      holder_name: tab === "bs" ? holder.trim() : `USDT · ${wallet.trim().slice(0, 20)}`,
      reference: tab === "bs" ? reference.trim() : txHash.trim(),
    } as any);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Solicitud enviada. Un administrador validará tu recarga."); onClose(); }
  }

  return (
    <ModalShell title="Centro de Recargas" onClose={onClose}>
      <div className="mb-3 flex gap-2 rounded-full bg-black/30 p-1">
        <button onClick={() => setTab("bs")} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${tab === "bs" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Bolívares</button>
        <button onClick={() => setTab("usdt")} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${tab === "usdt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>USDT (BEP20)</button>
      </div>

      {tab === "bs" ? (
        <div className="glass-card space-y-2 rounded-2xl p-4 text-sm">
          <div className="font-semibold">Datos bancarios</div>
          <Row label="Banco" value="Banco Venezolano de Crédito" copy="Banco Venezolano de Crédito" />
          <Row label="Nombre" value="Orlanda Ramírez Acosta" copy="Orlanda Ramírez Acosta" />
          <Row label="Cuenta" value="0104-0019-86-0190162931" copy="01040019860190162931" mono />
          <Row label="Cédula" value="8.634.091" copy="8634091" />
        </div>
      ) : (
        <div className="glass-card space-y-2 rounded-2xl p-4 text-sm">
          <div className="font-semibold">Dirección USDT (Red BEP20 · Smart Chain)</div>
          <div className="rounded-xl bg-black/40 p-3 font-mono text-[11px] break-all text-cyan-glow">
            0x2c70345879534404d45371ab46eecd6eb28b55c0
          </div>
          <div className="flex justify-end"><CopyBtn text="0x2c70345879534404d45371ab46eecd6eb28b55c0" /></div>
          <div className="text-[10px] text-muted-foreground">Envía únicamente USDT en la red Smart Chain (BEP20). Otras redes se perderán.</div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            Monto a depositar ({tab === "bs" ? "Bs" : "USD"}) <span className="text-red-400">*</span>
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            min={min}
            placeholder={tab === "bs" ? "Mínimo 5.000 Bs" : "Mínimo $5.00"}
            className={`w-full rounded-2xl glass-input px-4 py-3 outline-none ${belowMin ? "border-red-500" : "focus:border-primary"}`}
          />
          {amt > 0 && !belowMin && (
            <p className="mt-1 text-[11px] text-muted-foreground">≈ {tab === "bs" ? usd(usdEquivalent) : bsFromUsd(usdEquivalent)}</p>
          )}
          {belowMin && (
            <p className="mt-1 text-xs font-semibold text-red-400">
              {tab === "bs" ? "El monto mínimo de depósito es de 5.000 Bs" : "El monto mínimo de depósito es de $5.00 USD"}
            </p>
          )}
        </label>

        {tab === "bs" ? (
          <>
            <Input label="Cédula" value={cedula} onChange={setCedula} inputMode="numeric" />
            <Input label="Nombre del titular del banco" value={holder} onChange={setHolder} />
            <Input label="Referencia" value={reference} onChange={setReference} inputMode="numeric" />
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Subir imagen del comprobante <span className="text-red-400">*</span></span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-muted-foreground" />
            </label>
          </>
        ) : (
          <>
            <Input label="Dirección de billetera origen" value={wallet} onChange={setWallet} placeholder="0x…" />
            <Input label="Hash / TXID de la transacción" value={txHash} onChange={setTxHash} placeholder="0x…" />
          </>
        )}

        <button disabled={loading || belowMin} onClick={submit} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground glow-cyan disabled:opacity-50">{loading ? "Enviando…" : "Notificar pago"}</button>
      </div>
    </ModalShell>
  );
}

function Row({ label, value, copy, mono }: { label: string; value: string; copy: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 py-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-right text-xs ${mono ? "font-mono" : ""} text-foreground`}>{value}</div>
      <CopyBtn text={copy} />
    </div>
  );
}

function Input({ label, value, onChange, inputMode, placeholder }: { label: string; value: string; onChange: (v: string) => void; inputMode?: any; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label} <span className="text-red-400">*</span></span>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} placeholder={placeholder} className="w-full rounded-2xl glass-input px-4 py-3 outline-none focus:border-primary" />
    </label>
  );
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const selectedBank = banksQ.data?.find((b: any) => b.id === bankId);

  const MIN = 5;
  const FEE = 1;
  const amt = parseFloat(amount) || 0;
  const net = amt > 0 ? Math.max(0, amt - FEE) : 0;
  const belowMin = amt > 0 && amt < MIN;

  async function requestPin() {
    if (amt < MIN) { setError(`El monto mínimo de retiro es de $${MIN}.00 USD`); return; }
    if (!bankId) { setError("Selecciona una cuenta / billetera de destino"); return; }
    setError(null);
    const { data, error: e } = await supabase.rpc("generate_withdrawal_pin");
    if (e) return toast.error(e.message);
    setGeneratedPin(String(data));
    setStep(2);
    toast.success("Código de verificación generado (vence en 5 min)");
  }

  async function submit() {
    setLoading(true);
    const { error: e } = await supabase.rpc("create_withdrawal", { _amount: amt, _bank_account_id: bankId, _pin: pin });
    setLoading(false);
    if (e) toast.error(e.message);
    else { toast.success("Solicitud de retiro enviada"); onClose(); }
  }

  return (
    <ModalShell title="Retirar fondos" onClose={onClose}>
      {banksQ.data && banksQ.data.length === 0 ? (
        <div className="glass-card rounded-2xl p-4 text-sm text-muted-foreground">Primero agrega una cuenta o billetera desde "Cuenta de retiro".</div>
      ) : step === 1 ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Monto (USD) · mínimo $5.00</span>
            <input
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              type="number"
              min={MIN}
              className={`w-full rounded-2xl glass-input px-4 py-3 ${belowMin || error ? "border-red-500" : ""}`}
            />
            {amt > 0 && !belowMin && (
              <p className="mt-1.5 text-xs text-neon">
                Neto a recibir: <strong>{usd(net)}</strong> · comisión fija $1.00
              </p>
            )}
            {(belowMin || error) && (
              <p className="mt-1.5 text-xs font-semibold text-red-400">
                {error ?? `El monto mínimo de retiro es de $${MIN}.00 USD`}
              </p>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Cuenta / billetera destino</span>
            <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="w-full rounded-2xl glass-input px-4 py-3">
              <option value="">Selecciona…</option>
              {banksQ.data?.map((b) => <option key={b.id} value={b.id}>{b.bank} · {b.holder_name}</option>)}
            </select>
          </label>
          <button disabled={!amount || !bankId || belowMin} onClick={requestPin} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground glow-cyan disabled:opacity-50">
            Enviar código de verificación
          </button>
        </div>
      ) : step === 2 ? (
        <div className="space-y-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Código de verificación</div>
            <div className="mt-1 font-display text-3xl font-bold tracking-widest text-cyan-glow">{generatedPin}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Válido por 5 minutos</div>
          </div>
          <div className="glass-card rounded-2xl p-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Monto solicitado</span><span className="font-medium">{usd(amt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Comisión fija</span><span className="font-medium text-red-400">−{usd(FEE)}</span></div>
            <div className="mt-1 flex justify-between border-t border-white/10 pt-1"><span className="font-semibold">Neto a recibir</span><span className="font-bold text-neon">{usd(net)}</span></div>
            <div className="mt-1 text-[10px] text-muted-foreground">≈ {bsFromUsd(net)}</div>
          </div>
          <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Introduce el código" className="w-full rounded-2xl glass-input px-4 py-3 text-center text-xl tracking-widest" />
          <button
            disabled={pin.length < 4}
            onClick={() => setStep(3)}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground glow-cyan disabled:opacity-50"
          >
            Revisar y confirmar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl border border-[oklch(0.85_0.22_145)]/40 p-4">
            <div className="text-sm font-bold text-neon">⚠ Confirma tu retiro</div>
            <p className="mt-1 text-xs text-muted-foreground">
              ¿Estás seguro de enviar tu retiro a este destino? Las transacciones enviadas a direcciones incorrectas no pueden ser revertidas.
            </p>
            <div className="mt-3 space-y-1 rounded-xl bg-black/40 p-3 text-xs">
              <div><span className="text-muted-foreground">Banco/Red:</span> <span className="font-semibold">{selectedBank?.bank}</span></div>
              <div><span className="text-muted-foreground">Titular:</span> <span className="font-semibold">{selectedBank?.holder_name}</span></div>
              {selectedBank?.account_number && <div><span className="text-muted-foreground">Cuenta:</span> <span className="font-mono">{selectedBank.account_number}</span></div>}
              {selectedBank?.cedula && <div><span className="text-muted-foreground">Cédula:</span> <span className="font-mono">{selectedBank.cedula}</span></div>}
              <div className="mt-1 border-t border-white/10 pt-1 flex justify-between"><span className="text-muted-foreground">Neto:</span> <span className="font-bold text-neon">{usd(net)}</span></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 rounded-full bg-white/5 py-3 text-sm text-muted-foreground">Volver</button>
            <button disabled={loading} onClick={submit} className="flex-1 rounded-full bg-primary py-3 font-semibold text-primary-foreground glow-cyan disabled:opacity-50">
              {loading ? "Procesando…" : "Enviar solicitud"}
            </button>
          </div>
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
    if (!bank || !holder || !cedula) return toast.error("Completa los campos obligatorios");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("bank_accounts").insert({ user_id: user.id, bank, holder_name: holder, cedula, account_number: account, account_type: accountType } as any);
    if (error) toast.error(error.message);
    else { toast.success("Cuenta guardada"); setBank(""); setHolder(""); setCedula(""); setAccount(""); qc.invalidateQueries({ queryKey: ["my-banks-list"] }); qc.invalidateQueries({ queryKey: ["my-banks"] }); }
  }
  return (
    <ModalShell title="Cuentas de retiro" onClose={onClose}>
      <div className="mb-4 space-y-2">
        {banksQ.data?.map((b: any) => (
          <div key={b.id} className="glass-card rounded-2xl p-3 text-sm">
            <div className="font-medium">{b.bank} · <span className="text-xs text-muted-foreground">{b.account_type ?? "Ahorros"}</span></div>
            <div className="text-xs text-muted-foreground">{b.holder_name} · {b.cedula}</div>
            {b.account_number && <div className="text-xs text-muted-foreground font-mono">{b.account_number}</div>}
          </div>
        ))}
      </div>
      <div className="glass-card space-y-3 rounded-2xl p-4">
        <div className="text-sm font-semibold">Agregar cuenta / billetera</div>
        <select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full rounded-xl glass-input px-3 py-2.5 text-sm">
          <option value="">Banco o red…</option>
          {VENEZUELA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          <option value="USDT · BEP20">USDT · Red BEP20</option>
          <option value="USDT · TRC20">USDT · Red TRC20</option>
        </select>
        <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full rounded-xl glass-input px-3 py-2.5 text-sm">
          <option value="Ahorros">Cuenta de Ahorros</option>
          <option value="Corriente">Cuenta Corriente</option>
          <option value="USDT">Billetera USDT</option>
        </select>
        <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nombre completo del titular" className="w-full rounded-xl glass-input px-3 py-2.5 text-sm" />
        <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula / RIF (o alias de billetera)" className="w-full rounded-xl glass-input px-3 py-2.5 text-sm" />
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Número de cuenta o dirección wallet" className="w-full rounded-xl glass-input px-3 py-2.5 text-sm" />
        <button onClick={save} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground glow-cyan">Guardar dirección de retiro</button>
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

  function statusBadge(s: string) {
    if (s === "pending") return <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">Pendiente</span>;
    if (s === "approved") return <span className="rounded-full bg-[oklch(0.85_0.22_145)]/20 px-2 py-0.5 text-[10px] font-semibold text-neon">Aprobado</span>;
    return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">Rechazado</span>;
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-2">
        {q.data && q.data.length > 0 ? q.data.map((r: any) => (
          <div key={r.id} className="glass-card rounded-xl p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {type === "movements" ? (r.description ?? r.kind) : (r.description ?? title)}
                </div>
                <div className="text-[10px] text-muted-foreground">ID: {r.id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className={Number(r.amount) >= 0 ? "text-neon" : "text-red-300"}>{usd(r.amount)}</div>
                <div className="text-[10px] text-muted-foreground">{bs(Math.abs(Number(r.amount)) * USD_TO_BS)}</div>
                {r.status && <div className="mt-1">{statusBadge(r.status)}</div>}
              </div>
            </div>
          </div>
        )) : <p className="py-6 text-center text-sm text-muted-foreground">Sin registros</p>}
      </div>
    </ModalShell>
  );
}
