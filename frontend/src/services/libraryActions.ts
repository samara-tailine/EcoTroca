import type { Disposal } from "./student.types";
import type { LibraryAction } from "./library.types";

export const ACTION_LABELS: Record<LibraryAction, string> = {
  receive: "Registrar recebimento",
  check: "Registrar conferência",
  approve: "Aprovar solicitação",
  reject: "Rejeitar solicitação",
};
export const ACTION_SUCCESS: Record<LibraryAction, string> = {
  receive: "Recebimento registrado com sucesso.",
  check: "Conferência e divergências registradas com sucesso.",
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
    | "totalWeightGramsSnapshot"
  >,
  actorId: string,
): Record<LibraryAction, string | null> {
  const open = ["PENDING", "RECEIVED", "IN_REVIEW"].includes(request.status);
  return {
    receive:
      request.status === "PENDING"
        ? null
        : "O recebimento só pode ser registrado em uma solicitação pendente.",
    check:
      request.status === "RECEIVED" && request.receivedAt
        ? null
        : "Registre o recebimento antes da conferência. Uma conferência concluída não pode ser repetida.",
    approve:
      request.requesterId === actorId
        ? "Você não pode aprovar sua própria solicitação."
        : request.status !== "IN_REVIEW" ||
            !request.receivedAt ||
            !request.checkedAt
          ? "A aprovação exige recebimento e conferência registrados."
          : request.totalWeightGramsSnapshot === null
            ? "O peso histórico está indisponível. A solicitação precisa ser revisada antes da aprovação."
            : null,
    reject: open
      ? null
      : "Solicitações concluídas não podem ser rejeitadas novamente.",
  };
}
