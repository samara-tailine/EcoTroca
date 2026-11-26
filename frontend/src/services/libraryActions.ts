import type { Disposal } from "./student.types";
import type { LibraryAction } from "./library.types";
import { observedTotals } from "../utils/observedDisposal";

export const ACTION_LABELS: Record<LibraryAction, string> = {
  receive: "Registrar recebimento",
  check: "Registrar conferência",
  approve: "Aprovar solicitação",
  reject: "Rejeitar solicitação",
};
export const ACTION_SUCCESS: Record<LibraryAction, string> = {
  receive: "Recebimento registrado com sucesso.",
  check: "Quantidades conferidas e divergências registradas com sucesso.",
  approve: "Solicitação aprovada e EcoCoins creditados com sucesso.",
  reject: "Solicitação rejeitada com justificativa.",
};
export function libraryActionPolicy(
  request: Pick<
    Disposal,
    | "status"
    | "requesterId"
    | "receivedAt"
    | "checkedAt"
    | "totalWeightGramsObserved"
    | "items"
  >,
  actorId: string,
): Record<LibraryAction, string | null> {
  const open = ["PENDING", "RECEIVED", "IN_REVIEW"].includes(request.status);
  const total = observedTotals(request.items);
  const incomplete = request.items.some(
    (item) => item.quantityObserved === null,
  );
  return {
    receive:
      request.status === "PENDING"
        ? null
        : "O recebimento só pode ser registrado em uma solicitação pendente.",
    check:
      request.receivedAt &&
      (request.status === "RECEIVED" ||
        (request.status === "IN_REVIEW" && incomplete))
        ? null
        : "Registre o recebimento antes da conferência. Uma conferência completa não pode ser repetida.",
    approve:
      request.requesterId === actorId
        ? "Você não pode aprovar sua própria solicitação."
        : request.status !== "IN_REVIEW" ||
            !request.receivedAt ||
            !request.checkedAt
          ? "A aprovação exige recebimento e conferência registrados."
          : !total || request.totalWeightGramsObserved === null
            ? "Informe a quantidade conferida de todos os itens antes de aprovar."
            : total.weightGrams <= 0
              ? "Nenhum equipamento foi confirmado. Rejeite a solicitação com justificativa."
              : request.totalWeightGramsObserved !== total.weightGrams
                ? "O peso conferido está inconsistente. Atualize a solicitação."
                : null,
    reject: open
      ? null
      : "Solicitações concluídas não podem ser rejeitadas novamente.",
  };
}
