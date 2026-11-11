import type {
  FUNCTIONALITIES,
  PHYSICAL_CONDITIONS,
  Movement,
} from "./student.types";

export type LibraryAction = "receive" | "check" | "approve" | "reject";
export interface DivergenceInput {
  itemId: string;
  description: string;
  quantityObserved?: number;
  physicalConditionObserved?: (typeof PHYSICAL_CONDITIONS)[number];
  functionalityObserved?: (typeof FUNCTIONALITIES)[number];
}
export interface CheckInput {
  notes?: string;
  divergences?: DivergenceInput[];
}
export type LibraryCredit = Omit<Movement, "balanceAfter"> & {
  student: { id: string; name: string } | null;
};
