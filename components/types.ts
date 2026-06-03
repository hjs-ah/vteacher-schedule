export type ClassType =
  | "Preaching"
  | "Bible Study"
  | "Bible Foundation"
  | "Discipleship Class"
  | "New Members Class"
  | "Men's Weekly Study"
  | "Testimony";

export type ScheduleEntry = {
  id: string;
  classType: ClassType;
  date: string;         // ISO "2026-06-07" — start (or single) date
  dateEnd?: string;     // ISO "2026-06-30" — if set, this is a range entry
  facilitator: string;
  facilitator2?: string; // second speaker, Preaching only
  topic: string;
  notes?: string;
};

// Which weekday each class type meets for range expansion
// -1 = no fixed day (every day in range), -2 = 1st Saturday only
export const CLASS_RANGE_WEEKDAY: Record<string, number> = {
  "Preaching":          -2, // 1st Saturday only
  "Bible Study":        2,  // Tuesdays
  "Bible Foundation":   6,  // Saturdays
  "Discipleship Class": 1,  // Mondays
  "New Members Class":  4,  // Thursdays
  "Men's Weekly Study": 4,  // Thursdays
  "Testimony":          6,  // Saturdays
};

export const FULL_WEEKDAY: Record<string, string> = {
  "Preaching":          "1st Saturday",
  "Bible Study":        "Tuesdays",
  "Bible Foundation":   "Saturdays",
  "Discipleship Class": "Mondays",
  "New Members Class":  "Thursdays",
  "Men's Weekly Study": "Thursdays",
  "Testimony":          "Saturdays",
};

export const CLASS_ACCENT: Record<string, string> = {
  "Preaching":          "preaching",
  "Bible Study":        "bible-study",
  "Bible Foundation":   "bible-foundation",
  "Discipleship Class": "discipleship",
  "New Members Class":  "new-members",
  "Men's Weekly Study": "mens-study",
  "Testimony":          "testimony",
};

export const CLASS_LABELS: ClassType[] = [
  "Preaching",
  "Bible Study",
  "Bible Foundation",
  "Discipleship Class",
  "Testimony",
  "New Members Class",
  "Men's Weekly Study",
];

// All known ministers for the roster filter
export const ALL_MINISTERS = [
  "Antone", "Marquia", "Bryan", "Linda", "Shaheed", "Vashti",
  "Robin", "George", "Dominic", "Vernon", "Deborah", "Leslie",
  "Theodis", "Taravan", "Deacon Calvin", "Apostle John", "Vanessa",
];

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const DAY_LABELS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const FULL_DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/** Returns all display names for an entry (handles dual preachers) */
export function getFacilitatorDisplay(entry: ScheduleEntry): string {
  return entry.facilitator2
    ? `${entry.facilitator}, ${entry.facilitator2}`
    : entry.facilitator;
}

/** True if the entry involves the given minister name */
export function entryMatchesMinister(entry: ScheduleEntry, name: string): boolean {
  const n = name.toLowerCase();
  return (
    entry.facilitator.toLowerCase().includes(n) ||
    (entry.facilitator2?.toLowerCase().includes(n) ?? false)
  );
}

export function expandEntryDates(entry: ScheduleEntry): string[] {
  if (!entry.dateEnd) return [entry.date];

  const weekday = CLASS_RANGE_WEEKDAY[entry.classType];
  const start = parseLocalDate(entry.date);
  const end   = parseLocalDate(entry.dateEnd);
  const dates: string[] = [];

  if (weekday === -2) {
    const cur = new Date(start);
    while (cur.getDay() !== 6) cur.setDate(cur.getDate() + 1);
    if (cur <= end) dates.push(toISODate(cur));
    return dates;
  }

  if (weekday === -1) {
    const cur = new Date(start);
    while (cur <= end) { dates.push(toISODate(cur)); cur.setDate(cur.getDate() + 1); }
    return dates;
  }

  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() === weekday) dates.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
