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
  date: string;        // ISO "2026-06-07" — start (or single) date
  dateEnd?: string;    // ISO "2026-06-30" — if set, this is a range entry
  facilitator: string;
  topic: string;
  notes?: string;
};

// Which weekday each class type meets for range expansion
// -1 = no fixed day (use every day in range), -2 = 1st Saturday only
export const CLASS_RANGE_WEEKDAY: Record<string, number> = {
  "Preaching":          -2,  // 1st Saturday of range only
  "Bible Study":        2,   // Tuesdays
  "Bible Foundation":   6,   // Saturdays
  "Discipleship Class": 1,   // Mondays
  "New Members Class":  -1,  // every day in range (fully manual)
  "Men's Weekly Study": 4,   // Thursdays
  "Testimony":          6,   // Saturdays
};

export const FULL_WEEKDAY: Record<string, string> = {
  "Preaching":          "1st Saturday",
  "Bible Study":        "Tuesdays",
  "Bible Foundation":   "Saturdays",
  "Discipleship Class": "Mondays",
  "New Members Class":  "Flexible",
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

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const FULL_DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}

/** Parse an ISO date string to a local Date (avoids UTC shift) */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date to ISO string "YYYY-MM-DD" */
export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Expand a range entry into individual ISO date strings.
 * For single-date entries (no dateEnd), returns just [entry.date].
 * For range entries, returns all matching weekdays within the range.
 */
export function expandEntryDates(entry: ScheduleEntry): string[] {
  if (!entry.dateEnd) return [entry.date];

  const weekday = CLASS_RANGE_WEEKDAY[entry.classType];
  const start = parseLocalDate(entry.date);
  const end = parseLocalDate(entry.dateEnd);
  const dates: string[] = [];

  if (weekday === -2) {
    // 1st Saturday only — find first Saturday on or after start
    const cur = new Date(start);
    while (cur.getDay() !== 6) cur.setDate(cur.getDate() + 1);
    if (cur <= end) dates.push(toISODate(cur));
    return dates;
  }

  if (weekday === -1) {
    // Every day in range
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(toISODate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  // Specific weekday — walk range, collect matching days
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() === weekday) dates.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
