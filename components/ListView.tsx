"use client";
import {
  ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, DAY_LABELS,
  parseLocalDate, getFacilitatorDisplay, expandEntryDates,
  FULL_WEEKDAY, toISODate,
} from "./types";
import styles from "./ListView.module.css";

type Props = {
  entries: ScheduleEntry[];   // original filtered entries, dateEnd intact
  monthSlots: { year: number; month: number }[];
  onEntryClick: (date: Date, entries: ScheduleEntry[]) => void;
};

// A display row is either a collapsed "month ownership" row or a specific date row
type OwnershipRow = {
  kind: "ownership";
  entry: ScheduleEntry;
  dayLabel: string;   // e.g. "All Mondays" or "1st Saturday"
  count: number;      // how many sessions this covers
};
type DateRow = {
  kind: "date";
  iso: string;
  dayEntries: ScheduleEntry[];
};
type DisplayRow = OwnershipRow | DateRow;

export default function ListView({ entries, monthSlots, onEntryClick }: Props) {
  const today = new Date();
  const todayISO = toISODate(today);

  // For each month, build its display rows
  const monthGroups = monthSlots.map(({ year, month }) => {
    const rangeRows: OwnershipRow[] = [];
    const specificDateMap = new Map<string, ScheduleEntry[]>();

    for (const e of entries) {
      if (e.dateEnd) {
        // Range entry — check if it overlaps this month at all
        const dates = expandEntryDates(e).filter(iso => {
          const d = parseLocalDate(iso);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        if (dates.length === 0) continue;

        // Collapse to one ownership row
        const fullDay = FULL_WEEKDAY[e.classType];
        const dayLabel = fullDay ? `All ${fullDay}` : `${dates.length} session${dates.length !== 1 ? "s" : ""}`;
        rangeRows.push({ kind: "ownership", entry: e, dayLabel, count: dates.length });
      } else {
        // Specific date — check if in this month
        const d = parseLocalDate(e.date);
        if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
        if (!specificDateMap.has(e.date)) specificDateMap.set(e.date, []);
        specificDateMap.get(e.date)!.push(e);
      }
    }

    // Build sorted date rows
    const dateRows: DateRow[] = [...specificDateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, dayEntries]) => ({ kind: "date" as const, iso, dayEntries }));

    // Deduplicate range rows: same classType + facilitator = one row
    const seenOwnership = new Set<string>();
    const uniqueRangeRows = rangeRows.filter(r => {
      const key = `${r.entry.classType}::${r.entry.facilitator}`;
      if (seenOwnership.has(key)) return false;
      seenOwnership.add(key);
      return true;
    });

    // Sort ownership rows by class type order
    const classOrder = ["Preaching","Bible Study","Bible Foundation","Discipleship Class","Testimony","New Members Class","Men's Weekly Study"];
    uniqueRangeRows.sort((a, b) => classOrder.indexOf(a.entry.classType) - classOrder.indexOf(b.entry.classType));

    const allRows: DisplayRow[] = [...uniqueRangeRows, ...dateRows];
    const totalSessions = uniqueRangeRows.reduce((s, r) => s + r.count, 0) + dateRows.reduce((s, r) => s + r.dayEntries.length, 0);

    return { year, month, rows: allRows, totalSessions };
  });

  const hasAny = monthGroups.some(g => g.rows.length > 0);
  if (!hasAny) {
    return <div className={styles.empty}><p>No sessions match the current filters.</p></div>;
  }

  return (
    <div className={styles.root}>
      {monthGroups.map(({ year, month, rows, totalSessions }) => {
        if (rows.length === 0) return null;
        return (
          <div key={`${year}-${month}`} className={styles.monthGroup}>
            <div className={styles.monthHeading}>
              <span className={styles.monthName}>{MONTH_NAMES[month - 1]}</span>
              <span className={styles.yearLabel}>{year}</span>
              <span className={styles.sessionCount}>{totalSessions} session{totalSessions !== 1 ? "s" : ""}</span>
            </div>

            {/* Ownership rows first */}
            {rows.filter((r): r is OwnershipRow => r.kind === "ownership").length > 0 && (
              <div className={styles.ownershipSection}>
                <span className={styles.sectionLabel}>Monthly Assignments</span>
                <div className={styles.ownershipList}>
                  {rows.filter((r): r is OwnershipRow => r.kind === "ownership").map((row, i) => {
                    const accent = CLASS_ACCENT[row.entry.classType];
                    return (
                      <div key={`own-${i}`} className={styles.ownershipRow}>
                        <span className={styles.ownershipBar} style={{ background: `var(--accent-${accent})` }} />
                        <div className={styles.ownershipInfo}>
                          <div className={styles.ownershipTop}>
                            <span className={styles.ownershipClass}>{row.entry.classType}</span>
                            <span className={styles.ownershipDayLabel}>{row.dayLabel}</span>
                          </div>
                          <span className={styles.ownershipFacilitator}>{getFacilitatorDisplay(row.entry)}</span>
                          {row.entry.topic && row.entry.topic !== "Session" && (
                            <span className={styles.ownershipTopic}>{row.entry.topic}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specific date rows */}
            {rows.filter((r): r is DateRow => r.kind === "date").length > 0 && (
              <div className={styles.dateList}>
                {rows.filter((r): r is DateRow => r.kind === "date").map(row => {
                  const d = parseLocalDate(row.iso);
                  const isPast = row.iso < todayISO;
                  const isToday = row.iso === todayISO;
                  return (
                    <div
                      key={row.iso}
                      className={`${styles.dateRow} ${isPast ? styles.dateRowPast : ""} ${isToday ? styles.dateRowToday : ""}`}
                      onClick={() => onEntryClick(d, row.dayEntries)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onEntryClick(d, row.dayEntries); }}
                    >
                      <div className={styles.dateCol}>
                        {isToday && <span className={styles.todayPip} />}
                        <span className={styles.dayName}>{DAY_LABELS[d.getDay()]}</span>
                        <span className={styles.dayNum}>{d.getDate()}</span>
                      </div>
                      <div className={styles.sessionsCol}>
                        {row.dayEntries.map((entry, i) => {
                          const accent = CLASS_ACCENT[entry.classType];
                          return (
                            <div key={`${entry.id}-${i}`} className={styles.sessionRow}>
                              <span className={styles.classBar} style={{ background: `var(--accent-${accent})` }} />
                              <div className={styles.sessionText}>
                                <div className={styles.sessionTop}>
                                  <span className={styles.sessionClass}>{entry.classType}</span>
                                  {entry.topic && entry.topic !== "Session" && (
                                    <span className={styles.sessionTopic}>{entry.topic}</span>
                                  )}
                                </div>
                                <span className={styles.sessionFacilitator}>{getFacilitatorDisplay(entry)}</span>
                                {entry.notes && <span className={styles.sessionNotes}>{entry.notes}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
