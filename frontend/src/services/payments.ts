import { api } from "./api";
import type { Page } from "./student.types";
export interface PaymentInput {
  recipientId: string;
  amount: string;
  idempotencyKey: string;
}
export interface PaymentReceipt {
  id: string;
  kind: "PAYMENT" | "LEGACY_REDEMPTION";
  idempotencyKey: string;
  student: { id: string; name: string };
  recipient: { id: string; name: string } | null;
  amount: string;
  valueBrl: string;
  coinValueBrl: string;
  createdAt: string;
  balanceAfter?: string;
}
export const paymentsApi = {
  recipients: async (signal?: AbortSignal) =>
    (
      await api.get<{ id: string; name: string }[]>(
        "/ecocoins/payment-recipients",
        { signal },
      )
    ).data,
  pay: async (input: PaymentInput) =>
    (await api.post<PaymentReceipt>("/ecocoins/payments", input)).data,
  list: async (page: number, signal?: AbortSignal) =>
    (
      await api.get<Page<PaymentReceipt>>("/ecocoins/payments", {
        params: { page, pageSize: 10 },
        signal,
      })
    ).data,
  receipt: async (id: string, signal?: AbortSignal) =>
    (
      await api.get<PaymentReceipt>(
        `/ecocoins/payments/${encodeURIComponent(id)}`,
        { signal },
      )
    ).data,
};
