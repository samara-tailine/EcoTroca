import { api } from "./api";
import { getSessionSnapshot } from "../auth/session";
import type { Equipment } from "./catalog";
import type {
  CreateDisposalInput,
  Disposal,
  DisposalStatus,
  Movement,
  Page,
  StudentDashboard,
  Wallet,
} from "./student.types";

function scope() {
  const user = getSessionSnapshot().session?.user;
  if (!user || !user.accessProfiles.some(({ key }) => key === "STUDENT"))
    throw new Error("Acesso de estudante necessário.");
  const roles = user.accessProfiles.map(({ key }) => key);
  return {
    id: user.id,
    libraryView:
      roles.includes("LIBRARY") &&
      !roles.includes("ADMIN") &&
      !roles.includes("XEROX"),
  };
}

type DisposalQuery = {
  page: number;
  pageSize: number;
  status?: DisposalStatus;
};
async function ownedCollection(signal?: AbortSignal): Promise<Disposal[]> {
  const owner = scope().id;
  const first = (
    await api.get<Page<Disposal>>("/disposals", {
      params: { page: 1, pageSize: 100 },
      signal,
    })
  ).data;
  const owned = new Map(
    first.data
      .filter((item) => item.requesterId === owner)
      .map((item) => [item.id, item]),
  );
  // A API dá visão ampliada a quem também tem LIBRARY. Essa combinação continua
  // vendo somente seus próprios registros neste painel, sem alterar o backend.
  for (let page = 2; page <= Math.ceil(first.total / 100); page++) {
    const result = (
      await api.get<Page<Disposal>>("/disposals", {
        params: { page, pageSize: 100 },
        signal,
      })
    ).data;
    result.data.forEach((item) => {
      if (item.requesterId === owner) owned.set(item.id, item);
    });
  }
  return [...owned.values()].sort(
    (a, b) =>
      b.requestedAt.localeCompare(a.requestedAt) || a.id.localeCompare(b.id),
  );
}

async function disposals(
  query: DisposalQuery,
  signal?: AbortSignal,
): Promise<Page<Disposal>> {
  const owner = scope();
  if (owner.libraryView) {
    const data = (await ownedCollection(signal)).filter(
      (item) => !query.status || item.status === query.status,
    );
    return {
      data: data.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize,
      ),
      total: data.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  const result = (
    await api.get<Page<Disposal>>("/disposals", { params: query, signal })
  ).data;
  return {
    ...result,
    data: result.data.filter((item) => item.requesterId === owner.id),
  };
}

async function wallet(signal?: AbortSignal) {
  const owner = scope().id;
  const result = (await api.get<Wallet>("/ecocoins/wallet", { signal })).data;
  if (result.userId !== owner) throw new Error("Carteira não encontrada.");
  return result;
}

export const studentApi = {
  activeEquipment: async (signal?: AbortSignal) =>
    (await api.get<Equipment[]>("/equipment/active", { signal })).data,
  disposals,
  disposal: async (id: string, signal?: AbortSignal) => {
    const owner = scope().id;
    const result = (
      await api.get<Disposal>(`/disposals/${encodeURIComponent(id)}`, {
        signal,
      })
    ).data;
    if (result.requesterId !== owner)
      throw new Error("Solicitação não encontrada.");
    return result;
  },
  createDisposal: async (data: CreateDisposalInput) =>
    (await api.post<Disposal>("/disposals", data)).data,
  wallet,
  movements: async (page: number, signal?: AbortSignal) =>
    (
      await api.get<Page<Movement>>("/ecocoins/movements", {
        params: { page, pageSize: 10 },
        signal,
      })
    ).data,
  dashboard: async (signal?: AbortSignal): Promise<StudentDashboard> => {
    if (scope().libraryView) {
      const [balance, all] = await Promise.all([
        wallet(signal),
        ownedCollection(signal),
      ]);
      return {
        wallet: balance,
        latest: {
          data: all.slice(0, 5),
          total: all.length,
          page: 1,
          pageSize: 5,
        },
        pending: all.filter((item) => item.status === "PENDING").length,
        received: all.filter((item) => item.status === "RECEIVED").length,
        inReview: all.filter((item) => item.status === "IN_REVIEW").length,
        approved: all.filter((item) => item.status === "APPROVED").length,
      };
    }
    const [balance, latest, pending, received, inReview, approved] =
      await Promise.all([
        wallet(signal),
        disposals({ page: 1, pageSize: 5 }, signal),
        disposals({ page: 1, pageSize: 1, status: "PENDING" }, signal),
        disposals({ page: 1, pageSize: 1, status: "RECEIVED" }, signal),
        disposals({ page: 1, pageSize: 1, status: "IN_REVIEW" }, signal),
        disposals({ page: 1, pageSize: 1, status: "APPROVED" }, signal),
      ]);
    return {
      wallet: balance,
      latest,
      pending: pending.total,
      received: received.total,
      inReview: inReview.total,
      approved: approved.total,
    };
  },
};
