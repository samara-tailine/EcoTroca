export interface PendingPayment {
  recipientId: string;
  recipientName: string;
  amount: string;
  idempotencyKey: string;
  balanceBefore: string;
}
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function units(value: string): bigint | null {
  const match = /^(0|[1-9]\d{0,11})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  return match
    ? BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"))
    : null;
}
function decimal(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}
export function paymentAmount(input: string): string | null {
  const value = units(input);
  return value !== null && value > 0n ? decimal(value) : null;
}
export function remainingBalance(
  balance: string,
  amount: string,
): string | null {
  const before = units(balance),
    paid = units(amount);
  return before !== null && paid !== null && paid > 0n && before >= paid
    ? decimal(before - paid)
    : null;
}
export function formatPaymentBrl(input: string): string {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(input);
  if (!match) return "—";
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return `R$ ${BigInt(match[1]).toLocaleString("pt-BR")},${fraction.length === 3 && fraction.endsWith("0") ? fraction.slice(0, 2) : fraction}`;
}
export function readPayment(input: string | null): PendingPayment | null {
  try {
    const data = JSON.parse(input ?? "null");
    if (
      data &&
      uuid(data.recipientId) &&
      uuid(data.idempotencyKey) &&
      typeof data.recipientName === "string" &&
      typeof data.amount === "string" &&
      paymentAmount(data.amount) === data.amount &&
      typeof data.balanceBefore === "string" &&
      remainingBalance(data.balanceBefore, data.amount) !== null
    )
      return {
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        amount: data.amount,
        idempotencyKey: data.idempotencyKey,
        balanceBefore: data.balanceBefore,
      };
  } catch {
    /* Ignora rascunhos inválidos. */
  }
  return null;
}
