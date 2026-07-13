export const USD_TO_BS = 750;

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
export function bsFromUsd(n: number | string | null | undefined) {
  return bs(toNum(n) * USD_TO_BS);
}

/** Show "$X USD ≈ Bs Y" combined helper. */
export function usdWithBs(n: number | string | null | undefined) {
  return `${usd(n)} ≈ ${bsFromUsd(n)}`;
}

export const VENEZUELA_BANKS = [
  "Banco de Venezuela", "Banesco", "Banco Mercantil", "BBVA Provincial", "Banco Bicentenario",
  "Banco del Tesoro", "Banco Venezolano de Crédito", "Banco Exterior", "Banco Caroní",
  "Banco Plaza", "Banco Sofitasa", "Banco Activo", "BFC Banco Fondo Común", "100% Banco",
  "Bancrecer", "Banco Nacional de Crédito", "Banco Internacional de Desarrollo",
  "Banco Agrícola de Venezuela", "Mi Banco", "Banplus", "Bancamiga", "BanGente", "DelSur"
];
