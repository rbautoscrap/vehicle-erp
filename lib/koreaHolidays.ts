/**
 * Korea public holidays used for auction end-time defaults.
 * Includes substitute holidays and commonly observed dates (2026–2028).
 * Temporary holidays announced later may need manual updates.
 */
const HOLIDAYS = new Set<string>([
  // 2026
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-01",
  "2026-03-02",
  "2026-05-01",
  "2026-05-05",
  "2026-05-24",
  "2026-05-25",
  "2026-06-03",
  "2026-06-06",
  "2026-07-17",
  "2026-08-15",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-10-03",
  "2026-10-05",
  "2026-10-09",
  "2026-12-25",
  // 2027
  "2027-01-01",
  "2027-02-06",
  "2027-02-07",
  "2027-02-08",
  "2027-02-09",
  "2027-03-01",
  "2027-05-01",
  "2027-05-03",
  "2027-05-05",
  "2027-05-13",
  "2027-06-06",
  "2027-06-07",
  "2027-07-17",
  "2027-07-19",
  "2027-08-15",
  "2027-08-16",
  "2027-09-14",
  "2027-09-15",
  "2027-09-16",
  "2027-10-03",
  "2027-10-04",
  "2027-10-09",
  "2027-10-11",
  "2027-12-25",
  "2027-12-27",
  // 2028 (core dates; lunar holidays approximate / update yearly)
  "2028-01-01",
  "2028-01-26",
  "2028-01-27",
  "2028-01-28",
  "2028-03-01",
  "2028-05-01",
  "2028-05-05",
  "2028-05-02", // Buddha approx may vary — keep May 5 Children's Day
  "2028-06-06",
  "2028-07-17",
  "2028-08-15",
  "2028-10-03",
  "2028-10-09",
  "2028-12-25",
]);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toLocalInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isKoreaHoliday(d: Date) {
  return HOLIDAYS.has(dateKey(d));
}

/** Saturday=6, Sunday=0 */
export function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isKoreaBusinessDay(d: Date) {
  return !isWeekend(d) && !isKoreaHoliday(d);
}

/** Next calendar day from `from` (local), then skip weekends/holidays. */
export function nextKoreaBusinessDay(from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  let guard = 0;
  while (!isKoreaBusinessDay(d) && guard < 40) {
    d.setDate(d.getDate() + 1);
    guard += 1;
  }
  return d;
}

/** Next business day at 13:00 local time (auction default end). */
export function nextBusinessDayAt13(from = new Date()) {
  const d = nextKoreaBusinessDay(from);
  d.setHours(13, 0, 0, 0);
  return d;
}

export function atLocalTime(base: Date, hours: number, minutes = 0) {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}
