import { api } from "./api";
import type { Disposal, DisposalStatus, Page } from "./student.types";
import type { CheckInput, LibraryCredit } from "./library.types";

export const libraryApi = {
  queue: async (
    page: number,
    status: DisposalStatus | "",
    signal?: AbortSignal,
  ) =>
    (
      await api.get<Page<Disposal>>("/disposals", {
        params: { page, pageSize: 10, ...(status ? { status } : {}) },
        signal,
      })
    ).data,
  detail: async (id: string, signal?: AbortSignal) =>
    (
      await api.get<Disposal>(`/disposals/${encodeURIComponent(id)}`, {
        signal,
      })
    ).data,
  receive: async (id: string, notes?: string) =>
    (
      await api.patch<Disposal>(
        `/disposals/${encodeURIComponent(id)}/receive`,
        notes ? { notes } : {},
      )
    ).data,
  check: async (id: string, data: CheckInput) =>
    (
      await api.patch<Disposal>(
        `/disposals/${encodeURIComponent(id)}/check`,
        data,
      )
    ).data,
  approve: async (id: string, justification: string) =>
    (
      await api.patch<Disposal>(
        `/disposals/${encodeURIComponent(id)}/approve`,
        { justification },
      )
    ).data,
  reject: async (id: string, justification: string) =>
    (
      await api.patch<Disposal>(`/disposals/${encodeURIComponent(id)}/reject`, {
        justification,
      })
    ).data,
  credits: async (
    page: number,
    disposalRequestId: string,
    signal?: AbortSignal,
  ) =>
    (
      await api.get<Page<LibraryCredit>>("/ecocoins/credits", {
        params: {
          page,
          pageSize: 10,
          ...(disposalRequestId ? { disposalRequestId } : {}),
        },
        signal,
      })
    ).data,
};
