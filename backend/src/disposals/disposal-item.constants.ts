export const PHYSICAL_CONDITIONS = [
  'Novo',
  'Bom',
  'Regular',
  'Danificado',
] as const;
export const FUNCTIONALITIES = [
  'Funciona',
  'Funciona parcialmente',
  'Não funciona',
] as const;
export type PhysicalCondition = (typeof PHYSICAL_CONDITIONS)[number];
export type Functionality = (typeof FUNCTIONALITIES)[number];
