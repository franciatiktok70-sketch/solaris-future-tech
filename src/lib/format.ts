export function bs(n: number | string | null | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return "Bs " + (v ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const VENEZUELA_BANKS = [
  "Banco de Venezuela", "Banesco", "Banco Mercantil", "BBVA Provincial", "Banco Bicentenario",
  "Banco del Tesoro", "Banco Venezolano de Crédito", "Banco Exterior", "Banco Caroní",
  "Banco Plaza", "Banco Sofitasa", "Banco Activo", "BFC Banco Fondo Común", "100% Banco",
  "Bancrecer", "Banco Nacional de Crédito", "Banco Internacional de Desarrollo",
  "Banco Agrícola de Venezuela", "Mi Banco", "Banplus", "Bancamiga", "BanGente", "DelSur"
];
