/** Keep digits only (strips spaces, hyphens, country symbols, etc.). */
export function digitsOnly(value: string): string {
  return String(value || "").replace(/\D/g, "");
}
