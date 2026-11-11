import { Prisma } from '../generated/prisma/client.js';

export const ECOCOINS_PER_KG = new Prisma.Decimal('10');
export const ECOCOIN_VALUE_BRL = new Prisma.Decimal('0.10');
export const MAX_ECOCOIN_BALANCE = new Prisma.Decimal('999999999999.99');

export const ECOCOIN_AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
