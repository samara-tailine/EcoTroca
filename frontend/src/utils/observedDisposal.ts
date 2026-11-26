export function observedTotals(
  items: readonly {
    quantityObserved: number | null;
    averageWeightGramsSnapshot: number;
  }[],
) {
  if (
    !items.length ||
    items.some(
      (item) =>
        item.quantityObserved === null ||
        !Number.isInteger(item.quantityObserved) ||
        item.quantityObserved < 0 ||
        item.quantityObserved > 2147483647 ||
        !Number.isInteger(item.averageWeightGramsSnapshot) ||
        item.averageWeightGramsSnapshot < 1,
    )
  )
    return null;
  const grams = items.reduce(
    (sum, item) =>
      sum +
      BigInt(item.quantityObserved!) * BigInt(item.averageWeightGramsSnapshot),
    0n,
  );
  if (grams > 2147483647n) return null;
  // 10 EcoCoins/kg: cada grama corresponde a um centésimo de EcoCoin.
  return {
    weightGrams: Number(grams),
    ecoCoins: `${grams / 100n}.${(grams % 100n).toString().padStart(2, "0")}`,
  };
}
