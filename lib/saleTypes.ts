export const SALE_TYPES = ["폐차", "이전매각", "단품"] as const;

export type SaleType = (typeof SALE_TYPES)[number];

export function isSaleType(value: string): value is SaleType {
  return (SALE_TYPES as readonly string[]).includes(value);
}

/** Map legacy sale type labels to the current set. */
export function normalizeSaleType(value: string): string {
  const raw = String(value || "").trim();
  const legacy: Record<string, SaleType> = {
    Scrap: "폐차",
    Transfer: "이전매각",
    Export: "단품",
    Flooded: "단품",
    이전: "이전매각",
    수출: "단품",
    침수차: "단품",
  };
  if (isSaleType(raw)) return raw;
  return legacy[raw] || raw;
}
