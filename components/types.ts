export type ClassType =
  | "Bible Study"
  | "Bible Foundation"
  | "Discipleship Class"
  | "New Members Class"
  | "Men's Weekly Study";

export type ScheduleEntry = {
  id: string;
  classType: ClassType;
  month: number; // 1–12
  year: number;
  facilitator: string;
  topic: string;
  notes?: string;
};

// Which weekday each class type meets (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
export const CLASS_WEEKDAY: Record<string, number> = {
  "Bible Study": 2,       // Tuesday
  "Bible Foundation": 6,  // Saturday
  "Discipleship Class": 1, // Monday
  "New Members Class": -1, // date-specific — handled separately
  "Men's Weekly Study": -1, // date-specific
};

// Accent color var prefix per class type
export const CLASS_ACCENT: Record<string, string> = {
  "Bible Study": "bible-study",
  "Bible Foundation": "bible-foundation",
  "Discipleship Class": "discipleship",
  "New Members Class": "new-members",
  "Men's Weekly Study": "mens-study",
};

export const CLASS_LABELS: ClassType[] = [
  "Bible Study",
  "Bible Foundation",
  "Discipleship Class",
  "New Members Class",
  "Men's Weekly Study",
];

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** Returns all dates of a specific weekday within a given month/year */
export function getWeekdayDatesInMonth(year: number, month: number, weekday: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weekday) {
      dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Get initials from a full name */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Truncate a string to maxLen chars */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}
