export const USD_TO_BS = 1000;

function toNum(n: number | string | null | undefined): number {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return Number.isFinite(v) ? v : 0;
}

export function usd(n: number | string | null | undefined) {
  return "$" + toNum(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function bs(n: number | string | null | undefined) {
  return "Bs " + toNum(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert a USD amount into a formatted Bs reference string. */
export function bsFromUsd(n: number | string | null | undefined, rate: number = USD_TO_BS) {
  return bs(toNum(n) * rate);
}

/** Show "$X USD ≈ Bs Y" combined helper. */
export function usdWithBs(n: number | string | null | undefined, rate: number = USD_TO_BS) {
  return `${usd(n)} ≈ ${bsFromUsd(n, rate)}`;
}

/**
 * Real-time Bs currency mask: "2500,75" -> "2.500,75".
 * Keeps only digits and a single decimal comma (max 2 decimals).
 */
export function maskBs(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const [intPartRaw, ...rest] = cleaned.split(",");
  const intPart = (intPartRaw ?? "").replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (rest.length === 0) return grouped;
  const dec = rest.join("").slice(0, 2);
  return `${grouped || "0"},${dec}`;
}

/** Parse a masked Bs string ("2.500,75") back into a number. */
export function parseBs(masked: string): number {
  const normalized = masked.replace(/\./g, "").replace(",", ".");
  const v = parseFloat(normalized);
  return Number.isFinite(v) ? v : 0;
}

/** Business hours: 8:00 AM - 8:00 PM Venezuela time (UTC-4). */
export function isBusinessHoursVE(date: Date = new Date()): boolean {
  const h = venezuelaHour(date);
  return h >= 8 && h < 20;
}

export function venezuelaHour(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export const BUSINESS_HOURS_MSG =
  "Horario de atención: 8:00 AM a 8:00 PM (hora de Venezuela). Fuera de este horario no se procesan recargas ni retiros.";

export const VENEZUELA_BANKS = [
  "Banco de Venezuela", "Banesco", "Banco Mercantil", "BBVA Provincial", "Banco Bicentenario",
  "Banco del Tesoro", "Banco Venezolano de Crédito", "Banco Exterior", "Banco Caroní",
  "Banco Plaza", "Banco Sofitasa", "Banco Activo", "BFC Banco Fondo Común", "100% Banco",
  "Bancrecer", "Banco Nacional de Crédito", "Banco Internacional de Desarrollo",
  "Banco Agrícola de Venezuela", "Mi Banco", "Banplus", "Bancamiga", "BanGente", "DelSur"
];
