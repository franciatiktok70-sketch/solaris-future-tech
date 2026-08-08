import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/panel")({
  component: PanelPage,
  head: () => ({
    meta: [
      { title: "Panel Empresarial | Solaris Tech Solutions" },
      {
        name: "description",
        content:
          "Panel de administración empresarial de Solaris Tech Solutions: verificación SMS, tasa de cambio dinámica y control de usuarios.",
      },
      { property: "og:title", content: "Panel Empresarial | Solaris Tech Solutions" },
      {
        property: "og:description",
        content:
          "Administra usuarios, planes de infraestructura solar y tasa de cambio en tiempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ---------------------------------- utils --------------------------------- */

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function usePersistentRate() {
  const [rate, setRate] = useState(750);
  useEffect(() => {
    const saved = Number(localStorage.getItem("sft_rate"));
    if (saved > 0) setRate(saved);
  }, []);
  useEffect(() => {
    if (rate > 0) localStorage.setItem("sft_rate", String(rate));
  }, [rate]);
  return { rate, setRate };
}

/* --------------------------------- OTP gate -------------------------------- */

function OtpGate({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [expected, setExpected] = useState("");
  const [seconds, setSeconds] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step !== 2 || seconds === 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, seconds]);

  function sendSms(e?: React.FormEvent) {
    e?.preventDefault();
    if (phone.replace(/\D/g, "").length < 7) return toast.error("Número telefónico inválido");
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setExpected(generated);
    setStep(2);
    setSeconds(60);
    setCode(Array(6).fill(""));
    toast.success(`Código enviado a ${phone}`, { description: `Código de demostración: ${generated}` });
    setTimeout(() => inputs.current[0]?.focus(), 50);
  }

  function setDigit(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) verify(next.join(""));
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6)
      .fill("")
      .map((_, i) => text[i] ?? "");
    setCode(next);
    if (text.length === 6) verify(text);
  }

  function verify(value: string) {
    if (value === expected) {
      toast.success("Verificación completada");
      onVerified();
    } else {
      toast.error("Código incorrecto");
      setCode(Array(6).fill(""));
      inputs.current[0]?.focus();
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.18),transparent),radial-gradient(50%_40%_at_80%_80%,rgba(6,182,212,0.15),transparent)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/20 bg-slate-900/60 p-8 shadow-[0_0_60px_-15px_rgba(6,182,212,0.5)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-2xl text-slate-950">
            ☀
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Solaris Tech Solutions</h1>
          <p className="mt-1 text-sm text-slate-400">
            {step === 1 ? "Verificación en 2 pasos vía SMS" : "Ingresa el código de 6 dígitos"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={sendSms} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Número telefónico</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 412 000 0000"
                inputMode="tel"
                autoFocus
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3.5 text-base outline-none transition focus:border-cyan-400"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 py-3.5 font-semibold text-slate-950 transition active:scale-[0.98]"
            >
              Enviar código SMS
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-between gap-2" onPaste={onPaste}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={d}
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
                  }}
                  className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/70 text-center text-xl font-semibold outline-none transition focus:border-emerald-400 focus:shadow-[0_0_20px_-4px_rgba(16,185,129,0.7)]"
                />
              ))}
            </div>

            <button
              onClick={() => verify(code.join(""))}
              className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 py-3.5 font-semibold text-slate-950 transition active:scale-[0.98]"
            >
              Verificar e ingresar
            </button>

            <div className="text-center text-sm">
              {seconds > 0 ? (
                <span className="text-slate-500">
                  Reenviar SMS en <span className="font-mono text-cyan-300">00:{String(seconds).padStart(2, "0")}</span>
                </span>
              ) : (
                <button onClick={() => sendSms()} className="font-medium text-cyan-300 hover:text-cyan-200">
                  Reenviar SMS
                </button>
              )}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Cambiar número telefónico
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- panel ---------------------------------- */

type Row = {
  id: string;
  username: string;
  email: string;
  balance: number;
  total_recharged: number;
  created_at: string;
  plan: string;
  verified: boolean;
  phone: string;
  suspended: boolean;
};

const PLAN_COLORS = ["#22d3ee", "#34d399", "#38bdf8", "#a3e635"];

function PanelPage() {
  const [verified, setVerified] = useState(false);
  const { rate, setRate } = usePersistentRate();
  const [rateDraft, setRateDraft] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Partial<Row>>>({});

  useEffect(() => setRateDraft(String(rate)), [rate]);

  const usersQ = useQuery({
    queryKey: ["panel-users"],
    enabled: verified,
    queryFn: async () => {
      const { data: users } = await supabase.rpc("admin_list_users");
      const { data: invs } = await supabase.rpc("admin_list_investments");
      const planByUser = new Map<string, string>();
      (invs ?? []).forEach((i: any) => {
        if (i.active && !planByUser.has(i.user_id)) planByUser.set(i.user_id, i.plan_name);
      });
      return (users ?? []).map((u: any): Row => ({
        id: u.id,
        username: u.username,
        email: u.email,
        balance: Number(u.balance ?? 0),
        total_recharged: Number(u.total_recharged ?? 0),
        created_at: u.created_at,
        plan: planByUser.get(u.id) ?? "Sin plan",
        verified: Number(u.total_recharged ?? 0) > 0,
        phone: u.email?.split("@")[0] ?? "—",
        suspended: false,
      }));
    },
  });

  const rows: Row[] = useMemo(
    () => (usersQ.data ?? []).map((r) => ({ ...r, ...(overrides[r.id] ?? {}) })),
    [usersQ.data, overrides],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalBalance = rows.reduce((a, r) => a + r.balance, 0);
    const totalRecharged = rows.reduce((a, r) => a + r.total_recharged, 0);
    const byPlan = new Map<string, number>();
    rows.forEach((r) => byPlan.set(r.plan, (byPlan.get(r.plan) ?? 0) + 1));
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const count = rows.filter((r) => (r.created_at ?? "").slice(0, 10) === key).length;
      return { day: d.toLocaleDateString("es-VE", { weekday: "short" }), altas: count };
    });
    return {
      totalBalance,
      totalRecharged,
      verified: rows.filter((r) => r.verified).length,
      planData: Array.from(byPlan, ([name, value]) => ({ name, value })),
      days,
      volume: days.map((d, i) => ({
        day: d.day,
        usd: Math.round((totalRecharged / 7) * (0.6 + ((i * 13) % 9) / 10)),
      })),
    };
  }, [rows]);

  if (!verified) return <OtpGate onVerified={() => setVerified(true)} />;

  function applyRate(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(rateDraft);
    if (!Number.isFinite(v) || v <= 0) return toast.error("Tasa inválida");
    setRate(v);
    toast.success(`Tasa actualizada: 1 USD = ${money(v)} Bs.`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_40%_at_20%_0%,rgba(16,185,129,0.12),transparent),radial-gradient(50%_40%_at_90%_10%,rgba(6,182,212,0.12),transparent)]" />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-cyan-400/15 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
              ☀
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Solaris Tech Solutions</p>
              <p className="text-[11px] text-slate-500">Panel empresarial</p>
            </div>
          </div>

          <form onSubmit={applyRate} className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:block">Tasa $ → Bs.</span>
            <input
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              inputMode="decimal"
              className="w-28 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-right font-mono text-sm outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 active:scale-95"
            >
              Aplicar
            </button>
            <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 md:block">
              1 USD = {money(rate)} Bs.
            </span>
          </form>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Usuarios", value: String(rows.length), sub: `${stats.verified} verificados` },
            {
              label: "Saldo total",
              value: `$${money(stats.totalBalance)}`,
              sub: `Bs. ${money(stats.totalBalance * rate)}`,
            },
            {
              label: "Recargas acumuladas",
              value: `$${money(stats.totalRecharged)}`,
              sub: `Bs. ${money(stats.totalRecharged * rate)}`,
            },
            { label: "Planes activos", value: String(stats.planData.filter((p) => p.name !== "Sin plan").reduce((a, p) => a + p.value, 0)), sub: "Infraestructura contratada" },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-cyan-400/15 bg-slate-900/50 p-4 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-200">{k.value}</p>
              <p className="mt-0.5 text-xs text-emerald-300/80">{k.sub}</p>
            </div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-slate-900/50 p-4 backdrop-blur-xl lg:col-span-2">
            <p className="mb-3 text-sm font-medium text-slate-300">Volumen operativo (Bs.)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.volume.map((v) => ({ ...v, bs: v.usd * rate }))}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} width={70} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #164e63", borderRadius: 12 }}
                    formatter={(v: any) => [`Bs. ${money(Number(v))}`, "Volumen"]}
                  />
                  <Area type="monotone" dataKey="bs" stroke="#22d3ee" fill="url(#g1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-slate-900/50 p-4 backdrop-blur-xl">
            <p className="mb-3 text-sm font-medium text-slate-300">Distribución de planes</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.planData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {stats.planData.map((_, i) => (
                      <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #164e63", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-slate-900/50 p-4 backdrop-blur-xl lg:col-span-3">
            <p className="mb-3 text-sm font-medium text-slate-300">Altas de usuarios (7 días)</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.days}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #164e63", borderRadius: 12 }} />
                  <Bar dataKey="altas" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Users table */}
        <section className="rounded-2xl border border-cyan-400/15 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 p-4">
            <h2 className="text-sm font-medium text-slate-200">Gestión de usuarios</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo o plan…"
              className="ml-auto w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-400 sm:w-72"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Verificación</th>
                  <th className="px-4 py-3">Plan de infraestructura</th>
                  <th className="px-4 py-3 text-right">Saldo (Bs.)</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersQ.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Cargando datos…
                    </td>
                  </tr>
                )}
                {!usersQ.isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Sin resultados
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{r.username}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.phone}</td>
                    <td className="px-4 py-3">
                      {r.suspended ? (
                        <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-xs text-rose-300">
                          Suspendido
                        </span>
                      ) : r.verified ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                          Verificado
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-xs text-cyan-200">
                        {r.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cyan-200">
                      {money(r.balance * rate)}
                      <span className="block text-[11px] text-slate-500">${money(r.balance)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEdit(r)}
                          className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setOverrides((o) => ({ ...o, [r.id]: { ...o[r.id], suspended: !r.suspended } }));
                            toast.success(r.suspended ? "Usuario reactivado" : "Usuario suspendido");
                          }}
                          className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-400/10"
                        >
                          {r.suspended ? "Reactivar" : "Suspender"}
                        </button>
                        <button
                          onClick={() => setDetail(r)}
                          className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/10"
                        >
                          Ver detalles
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Detail modal */}
      {detail && (
        <Modal title="Detalles del usuario" onClose={() => setDetail(null)}>
          <dl className="space-y-2 text-sm">
            {[
              ["Nombre", detail.username],
              ["Correo", detail.email],
              ["Teléfono", detail.phone],
              ["Plan", detail.plan],
              ["Verificación", detail.suspended ? "Suspendido" : detail.verified ? "Verificado" : "Pendiente"],
              ["Saldo", `$${money(detail.balance)} · Bs. ${money(detail.balance * rate)}`],
              ["Recargas", `$${money(detail.total_recharged)} · Bs. ${money(detail.total_recharged * rate)}`],
              ["Registro", new Date(detail.created_at).toLocaleString("es-VE")],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-800 pb-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}

      {/* Edit modal */}
      {edit && (
        <Modal title="Editar usuario" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget as HTMLFormElement);
              setOverrides((o) => ({
                ...o,
                [edit.id]: {
                  ...o[edit.id],
                  username: String(form.get("username") ?? edit.username),
                  phone: String(form.get("phone") ?? edit.phone),
                  plan: String(form.get("plan") ?? edit.plan),
                },
              }));
              toast.success("Datos actualizados en el panel");
              setEdit(null);
            }}
            className="space-y-3"
          >
            {[
              { name: "username", label: "Nombre", def: edit.username },
              { name: "phone", label: "Teléfono", def: edit.phone },
              { name: "plan", label: "Plan de infraestructura", def: edit.plan },
            ].map((f) => (
              <label key={f.name} className="block">
                <span className="mb-1 block text-xs text-slate-400">{f.label}</span>
                <input
                  name={f.name}
                  defaultValue={f.def}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
                />
              </label>
            ))}
            <button className="mt-2 w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 py-3 text-sm font-semibold text-slate-950 active:scale-95">
              Guardar cambios
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-slate-900/90 p-6 text-slate-100 shadow-[0_0_60px_-20px_rgba(6,182,212,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
