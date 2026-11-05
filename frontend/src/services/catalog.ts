import { api } from "./api";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  officialCatalogKey: string | null;
  averageWeightGrams: number;
  isActive: boolean;
  category: Pick<Category, "id" | "name" | "isActive">;
}

export interface CategoryInput {
  name: string;
  description: string | null;
}

export interface EquipmentInput extends CategoryInput {
  categoryId: string;
  averageWeightGrams: number;
}

export const categoriesApi = {
  list: async (signal?: AbortSignal) =>
    (await api.get<Category[]>("/categories", { signal })).data,
  create: async (data: CategoryInput) =>
    (await api.post<Category>("/categories", data)).data,
  update: async (id: string, data: CategoryInput) =>
    (await api.patch<Category>(`/categories/${id}`, data)).data,
  setStatus: async (id: string, isActive: boolean) =>
    (await api.patch<Category>(`/categories/${id}/status`, { isActive })).data,
};

export const equipmentApi = {
  list: async (signal?: AbortSignal) =>
    (await api.get<Equipment[]>("/equipment", { signal })).data,
  create: async (data: EquipmentInput) =>
    (await api.post<Equipment>("/equipment", data)).data,
  update: async (
    id: string,
    data: Omit<EquipmentInput, "categoryId" | "averageWeightGrams"> & {
      categoryId?: string;
      averageWeightGrams?: number;
    },
  ) => (await api.patch<Equipment>(`/equipment/${id}`, data)).data,
  setStatus: async (id: string, isActive: boolean) =>
    (await api.patch<Equipment>(`/equipment/${id}/status`, { isActive })).data,
};
