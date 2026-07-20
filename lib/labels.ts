/** English display labels for values stored in Korean (admin forms). */

const SALE_TYPE_EN: Record<string, string> = {
  폐차: "Scrap",
  이전매각: "Transfer sale",
  단품: "Parts",
  이전: "Transfer sale",
  수출: "Parts",
  침수차: "Parts",
  Scrap: "Scrap",
  Transfer: "Transfer sale",
  Export: "Parts",
  Flooded: "Parts",
};

const FUEL_TYPE_EN: Record<string, string> = {
  가솔린: "Gasoline",
  디젤: "Diesel",
  LPG: "LPG",
  하이브리드: "Hybrid",
  "하이브리드(전기+가솔린)": "Hybrid(Electric+Gasoline)",
  "하이브리드(전기+디젤)": "Hybrid(Electric+Diesel)",
  전기: "Electric",
  기타: "Other",
  Gasoline: "Gasoline",
  Diesel: "Diesel",
  Hybrid: "Hybrid",
  "Hybrid(Electric+Gasoline)": "Hybrid(Electric+Gasoline)",
  "Hybrid(Electric+Diesel)": "Hybrid(Electric+Diesel)",
  Electric: "Electric",
  Other: "Other",
};

export function saleTypeLabelEn(value: string) {
  const key = String(value || "").trim();
  return SALE_TYPE_EN[key] || key || "-";
}

export function fuelTypeLabelEn(value: string) {
  const key = String(value || "").trim();
  return FUEL_TYPE_EN[key] || key || "-";
}
