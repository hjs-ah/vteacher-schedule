"use client";
import { ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, DAY_LABELS, FULL_DAY_NAMES, parseLocalDate, getFacilitatorDisplay } from "./types";
import styles from "./ListView.module.css";

type Props = {
  entries: ScheduleEntry[];          // already filtered
  monthSlots: { year: number; month: number }[];
  onEntryClick: (date: Date, entries: ScheduleEntry[]) => void;
};

export default function ListView({ entries, monthSlots, onEntryClick }: Props) {
  // Build date → entries map across all visible months
  const dateMap = new Map<string, ScheduleEntry[]>();
  for (const e of entries) {
    if (!dateMap.has(e.date)) dateMap.set(e.date, []);
    dateMap.get(e.date)!.push(e);
  }

  // Filter to only dates within our month slots and sort
  const visibleDates = [...dateMap.keys()]
    .filter(iso => {
      const d = parseLocalDate(iso);
      return monthSlots.some(s => s.year === d.getFullYear() && s.month === d.getMonth() + 1);
    })
    .sort();

  // Group by month
  type MonthGroup = { year: number; month: number; dates: string[] };
  const monthGroups: MonthGroup[] = [];
  for (const { year, month } of monthSlots) {
    const dates = visibleDates.filter(iso => {
      const d = parseLocalDate(iso);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    monthGroups.push({ year, month, dates });
  }

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  if (visibleDates.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No sessions match the current filters.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {monthGroups.map(({ year, month, dates }) => {
        if (dates.length === 0) return null;
        return (
          <div key={`${year}-${month}`} className={styles.monthGroup}>
            <div className={styles.monthHeading}>
              <span className={styles.monthName}>{MONTH_NAMES[month - 1]}</span>
              <span className={styles.yearLabel}>{year}</span>
              <span className={styles.sessionCount}>{dates.length} date{dates.length !== 1 ? "s" : ""}</span>
            </div>

            <div className={styles.dateList}>
              {dates.map(iso => {
                const dayEntries = dateMap.get(iso)!;
                const d = parseLocalDate(iso);
                const isPast = iso < todayISO;
                const isToday = iso === todayISO;

                return (
                  <div
                    key={iso}
                    className={`${styles.dateRow} ${isPast ? styles.dateRowPast : ""} ${isToday ? styles.dateRowToday : ""}`}
                    onClick={() => onEntryClick(d, dayEntries)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onEntryClick(d, dayEntries); }}
                  >
                    {/* Date column */}
                    <div className={styles.dateCol}>
                      {isToday && <span className={styles.todayPip} />}
                      <span className={styles.dayName}>{DAY_LABELS[d.getDay()]}</span>
                      <span className={styles.dayNum}>{d.getDate()}</span>
                    </div>

                    {/* Sessions */}
                    <div className={styles.sessionsCol}>
                      {dayEntries.map((entry, i) => {
                        const accent = CLASS_ACCENT[entry.classType];
                        return (
                          <div key={`${entry.id}-${i}`} className={styles.sessionRow}>
                            <span
                              className={styles.classBar}
                              style={{ background: `var(--accent-${accent})` }}
                            />
                            <div className={styles.sessionText}>
                              <div className={styles.sessionTop}>
                                <span className={styles.sessionClass}>{entry.classType}</span>
                                {entry.topic && entry.topic !== "Session" && (
                                  <span className={styles.sessionTopic}>{entry.topic}</span>
                                )}
                              </div>
                              <span className={styles.sessionFacilitator}>{getFacilitatorDisplay(entry)}</span>
                              {entry.notes && (
                                <span className={styles.sessionNotes}>{entry.notes}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
