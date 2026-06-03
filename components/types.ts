export type ClassType =
  | "Bible Study"
  | "Bible Foundation"
  | "Discipleship Class"
  | "New Members Class"
  | "Men's Weekly Study"
  | "Preaching"
  | "Testimony";

export type ScheduleEntry = {
  id: string;
  classType: ClassType;
  month: number; // 1-12
  year: number;
  facilitator: string;
  topic: string;
  notes?: string;
};

// Which weekday each class type meets (0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat)
export const CLASS_WEEKDAY: Record<string, number> = {
  "Bible Study": 2,          // Tuesdays
  "Bible Foundation": 6,     // Saturdays
  "Discipleship Class": 1,   // Mondays
  "New Members Class": -1,   // date-specific
  "Men's Weekly Study": -1,  // date-specific
  "Preaching": 0,            // Sundays
  "Testimony": 0,            // Sundays
};

// Full weekday names for display in section badges
export const FULL_WEEKDAY: Record<string, string> = {
  "Bible Study": "Tuesdays",
  "Bible Foundation": "Saturdays",
  "Discipleship Class": "Mondays",
  "New Members Class": "",
  "Men's Weekly Study": "",
  "Preaching": "Sundays",
  "Testimony": "Sundays",
};

export const CLASS_ACCENT: Record<string, string> = {
  "Bible Study": "bible-study",
  "Bible Foundation": "bible-foundation",
  "Discipleship Class": "discipleship",
  "New Members Class": "new-members",
  "Men's Weekly Study": "mens-study",
  "Preaching": "preaching",
  "Testimony": "testimony",
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

export function getWeekdayDatesInMonth(year: number, month: number, weekday: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weekday) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}
