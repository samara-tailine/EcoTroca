export type DisposalStatus =
  "PENDING" | "RECEIVED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
export const PHYSICAL_CONDITIONS = [
  "Novo",
  "Bom",
  "Regular",
  "Danificado",
] as const;
export const FUNCTIONALITIES = [
  "Funciona",
  "Funciona parcialmente",
  "Não funciona",
] as const;
export const STATUS_LABELS: Record<DisposalStatus, string> = {
  PENDING: "Pendente",
  RECEIVED: "Recebida",
  IN_REVIEW: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface DisposalItem {
  id: string;
  equipmentId: string;
  equipmentNameSnapshot: string | null;
  quantity: number;
  averageWeightGramsSnapshot: number;
  physicalCondition: string | null;
  functionality: string | null;
  photoUrl: string | null;
  equipment: { id: string; name: string };
  divergence: null | {
    description: string;
    quantityObserved: number | null;
    physicalConditionObserved: string | null;
    functionalityObserved: string | null;
    createdAt: string;
    recordedBy: { id: string; name: string };
  };
}
export interface Disposal {
  id: string;
  requesterId: string;
  requester: {
    id: string;
    name: string;
    email: string;
    studentIdentifier: string | null;
  };
  status: DisposalStatus;
  statusLabel: string;
  requestedAt: string;
  receivedAt: string | null;
  checkedAt: string | null;
  approvedAt: string | null;
  totalWeightGramsSnapshot: number | null;
  reviewNotes: string | null;
  reviewedBy: { id: string; name: string } | null;
  items: DisposalItem[];
  statusHistory: {
    id: string;
    fromStatus: DisposalStatus | null;
    toStatus: DisposalStatus;
    fromStatusLabel: string | null;
    toStatusLabel: string;
    notes: string | null;
    createdAt: string;
    actor: { id: string; name: string } | null;
  }[];
}
export interface CreateDisposalInput {
  items: {
    equipmentId: string;
    quantity: number;
    physicalCondition: (typeof PHYSICAL_CONDITIONS)[number];
    functionality: (typeof FUNCTIONALITIES)[number];
    photoUrl?: string;
  }[];
}
export interface Wallet {
  id: string;
  userId: string;
  balance: string;
  coinValueBrl: string;
  coinsPerKg: string;
  updatedAt: string;
}
export interface Movement {
  id: string;
  type: "CREDIT" | "DEBIT";
  typeLabel: string;
  amount: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
  responsible: { id: string; name: string } | null;
  origin: {
    type: string;
    label: string;
    disposalRequestId: string | null;
    weightGrams: number | null;
    coinsPerKg: string | null;
    coinValueBrl: string | null;
  };
  payment?: { id: string; valueBrl: string };
  redemption?: {
    idempotencyKey: string;
    valueBrl: string;
    student: { id: string; name: string };
  };
}
export interface StudentDashboard {
  wallet: Wallet;
  latest: Page<Disposal>;
  pending: number;
  received: number;
  inReview: number;
  approved: number;
}
