import { BadRequestException } from '@nestjs/common';

export function calculateObservedWeight(
  items: readonly {
    quantityObserved: number | null;
    averageWeightGramsSnapshot: number;
  }[],
): number {
  if (
    !items.length ||
    items.some(
      (item) =>
        !Number.isInteger(item.quantityObserved) ||
        item.quantityObserved === null ||
        item.quantityObserved < 0 ||
        item.quantityObserved > 2147483647 ||
        !Number.isInteger(item.averageWeightGramsSnapshot) ||
        item.averageWeightGramsSnapshot < 1,
    )
  )
    throw new BadRequestException(
      'Informe uma quantidade conferida válida para todos os itens.',
    );
  const total = items.reduce(
    (sum, item) =>
      sum +
      BigInt(item.quantityObserved!) * BigInt(item.averageWeightGramsSnapshot),
    0n,
  );
  if (total > 2147483647n)
    throw new BadRequestException(
      'O peso conferido excede o limite de 2.147.483.647 gramas.',
    );
  return Number(total);
}
