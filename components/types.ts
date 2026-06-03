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
  date: string;        // ISO "2026-06-07"
  facilitator: string;
  topic: string;
  notes?: string;
};

export const FULL_WEEKDAY: Record<string, string> = {
  "Preaching":          "1st Saturday",
  "Bible Study":        "Tuesdays",
  "Bible Foundation":   "Saturdays",
  "Discipleship Class": "Mondays",
  "New Members Class":  "",
  "Men's Weekly Study": "",
  "Testimony":          "Sundays",
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
