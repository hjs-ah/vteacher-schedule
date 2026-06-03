"use client";
import { useState } from "react";
import { ScheduleEntry, MONTH_NAMES, DAY_LABELS, truncate, parseLocalDate, CLASS_ACCENT, getFacilitatorDisplay } from "./types";
import styles from "./MonthCalendar.module.css";

type Props = {
  year: number;
  month: number;
  accent: string;                          // primary accent for this section
  dateMap: Map<string, ScheduleEntry[]>;   // ISO → entries for this class type
  allEntries: ScheduleEntry[];             // all filtered entries (for cross-class split detection)
  onDayClick: (date: Date, entries: ScheduleEntry[]) => void;
  onMonthClick: (year: number, month: number) => void;
};

export default function MonthCalendar({ year, month, accent, dateMap, allEntries, onDayClick, onMonthClick }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  // Count sessions this month for the header hint
  const sessionCount = [...dateMap.keys()].filter(iso => {
    const d = parseLocalDate(iso);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).length;

  // Build a cross-class map: ISO → all entries from ALL classes for split-cell detection
  // We only care about entries that share the same date as something in our dateMap
  const crossMap = new Map<string, ScheduleEntry[]>();
  for (const e of allEntries) {
    const iso = e.date; // already expanded by parent
    if (!crossMap.has(iso)) crossMap.set(iso, []);
    crossMap.get(iso)!.push(e);
  }

  return (
    <div className={styles.card}>
      <button
        className={styles.monthHeader}
        onClick={() => onMonthClick(year, month)}
        aria-label={`View all sessions for ${MONTH_NAMES[month - 1]} ${year}`}
      >
        <span className={styles.monthName}>{MONTH_NAMES[month - 1]}</span>
        <span className={styles.yearLabel}>{year}</span>
        {sessionCount > 0 && <span className={styles.monthViewHint}>view month ↗</span>}
      </button>

      <div className={styles.dayLabels}>
        {DAY_LABELS.map(d => <span key={d} className={styles.dayLabel}>{d}</span>)}
      </div>

      <div className={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <span key={`e-${idx}`} className={styles.emptyCell} />;

          const mm = String(month).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const isoKey = `${year}-${mm}-${dd}`;

          const thisClassEntries = dateMap.get(isoKey) ?? [];
          const hasEntry = thisClassEntries.length > 0;
          const isToday = isCurrentMonth && today.getDate() === day;
          const isHovered = hoveredDate === isoKey;
          const localDate = new Date(year, month - 1, day);

          // Check if another class also has an entry on this date (split-cell)
          const otherClassEntries = hasEntry
            ? (crossMap.get(isoKey) ?? []).filter(e => e.classType !== thisClassEntries[0].classType)
            : [];
          const splitEntry = otherClassEntries[0] ?? null;
          const splitAccent = splitEntry ? CLASS_ACCENT[splitEntry.classType] : null;

          return (
            <div
              key={day}
              className={`${styles.dayCell} ${hasEntry ? styles.dayCellActive : ""} ${isToday ? styles.dayCellToday : ""} ${splitEntry ? styles.dayCellSplit : ""}`}
              onMouseEnter={() => hasEntry && setHoveredDate(isoKey)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => {
                if (!hasEntry) return;
                const allDay = [
                  ...thisClassEntries,
                  ...otherClassEntries.filter(e => !thisClassEntries.find(t => t.id === e.id)),
                ];
                onDayClick(localDate, allDay);
              }}
              role={hasEntry ? "button" : undefined}
              tabIndex={hasEntry ? 0 : undefined}
              onKeyDown={hasEntry ? (e) => { if (e.key === "Enter" || e.key === " ") onDayClick(localDate, thisClassEntries); } : undefined}
              aria-label={hasEntry ? `${MONTH_NAMES[month - 1]} ${day}: ${thisClassEntries.map(e => e.facilitator).join(", ")}` : undefined}
            >
              {/* Split cell: left half = this class, right half = other class */}
              {hasEntry && splitEntry ? (
                <span
                  className={styles.splitCell}
                  style={{
                    "--left-bg": `var(--accent-${accent}-bg)`,
                    "--right-bg": `var(--accent-${splitAccent}-bg)`,
                    "--left-text": `var(--accent-${accent}-text)`,
                    "--right-text": `var(--accent-${splitAccent}-text)`,
                  } as React.CSSProperties}
                >
                  <span className={styles.splitLeft} />
                  <span className={styles.splitRight} />
                  <span className={styles.splitDayNumber}>{day}</span>
                </span>
              ) : hasEntry ? (
                <span
                  className={styles.solidCell}
                  style={{
                    "--cell-bg": `var(--accent-${accent}-bg)`,
                    "--cell-text": `var(--accent-${accent}-text)`,
                  } as React.CSSProperties}
                >
                  {day}
                </span>
              ) : (
                <span className={styles.dayNumber}>{day}</span>
              )}

              {/* Tooltip */}
              {hasEntry && isHovered && (
                <div className={styles.tooltip}>
                  {thisClassEntries.map((e, i) => (
                    <span key={i} className={styles.tooltipRow}>
                      <span className={styles.tooltipDot} style={{ background: `var(--accent-${accent})` }} />
                      <span className={styles.tooltipName}>{getFacilitatorDisplay(e)}</span>
                    </span>
                  ))}
                  {splitEntry && (
                    <span className={styles.tooltipRow}>
                      <span className={styles.tooltipDot} style={{ background: `var(--accent-${splitAccent})` }} />
                      <span className={styles.tooltipName}>{getFacilitatorDisplay(splitEntry)}</span>
                    </span>
                  )}
                  {(thisClassEntries[0]?.topic && thisClassEntries[0].topic !== "Session") && (
                    <span className={styles.tooltipTopic}>{truncate(thisClassEntries[0].topic, 26)}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sessionCount === 0 && <p className={styles.noEntries}>No sessions this month</p>}
    </div>
  );
}
