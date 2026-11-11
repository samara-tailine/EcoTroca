import type { DisposalStatus } from '../generated/prisma/client.js';

export const DISPOSAL_STATUS_LABELS: Record<DisposalStatus, string> = {
  PENDING: 'Pendente',
  RECEIVED: 'Recebida',
  IN_REVIEW: 'Em análise',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
};
