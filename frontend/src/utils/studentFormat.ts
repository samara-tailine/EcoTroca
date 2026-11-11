function minor(value: string): bigint | null {
  const match =
    typeof value === "string" ? /^(\d+)(?:\.(\d{1,2}))?$/.exec(value) : null;
  return match
    ? BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"))
    : null;
}
function scaled(value: bigint, scale: number, trim = false): string {
  const base = 10n ** BigInt(scale);
  const whole = (value / base).toLocaleString("pt-BR");
  let fraction = (value % base).toString().padStart(scale, "0");
  if (trim)
    while (fraction.length > 2 && fraction.endsWith("0"))
      fraction = fraction.slice(0, -1);
  return `${whole},${fraction}`;
}
export function formatCoins(value: string) {
  const units = minor(value);
  return units === null ? "—" : scaled(units, 2);
}
export function formatBrl(value: string) {
  const units = minor(value);
  return units === null ? "—" : `R$ ${scaled(units, 2)}`;
}
export function equivalentBrl(balance: string, rate: string) {
  const coins = minor(balance);
  const centsPerCoin = minor(rate);
  return coins === null || centsPerCoin === null
    ? "—"
    : `R$ ${scaled(coins * centsPerCoin, 4, true)}`;
}
export function redeemableBrl(balance: string, rate: string) {
  const coins = minor(balance);
  const centsPerCoin = minor(rate);
  return coins === null || centsPerCoin === null
    ? "—"
    : `R$ ${scaled(((coins / 10n) * 10n * centsPerCoin) / 100n, 2)}`;
}
export function formatDate(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
export function formatGrams(value: number | null | undefined) {
  return value == null ? "Não informado" : `${value.toLocaleString("pt-BR")} g`;
}
export function safePhotoUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
