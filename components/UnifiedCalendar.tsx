"use client";
import { useState } from "react";
import { ScheduleEntry, MONTH_NAMES, DAY_LABELS, CLASS_ACCENT, getFacilitatorDisplay, parseLocalDate, truncate } from "./types";
import styles from "./UnifiedCalendar.module.css";

// A day cell can have 0, 1, 2, or 3+ entries from different class types
export type DayEntries = ScheduleEntry[]; // all entries for that ISO date, already filtered

type Props = {
  year: number;
  month: number;
  dateMap: Map<string, DayEntries>;        // ISO → all entries this day (filtered)
  onDayClick: (date: Date, entries: DayEntries) => void;
  onMonthClick: (year: number, month: number) => void;
};

export default function UnifiedCalendar({ year, month, dateMap, onDayClick, onMonthClick }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = i - startOffset + 1;
    cells.push(d >= 1 && d <= daysInMonth ? d : null);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const sessionCount = [...dateMap.keys()].filter(iso => {
    const d = parseLocalDate(iso);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).length;

  return (
    <div className={styles.card}>
      {/* Clickable month header */}
      <button
        className={styles.monthHeader}
        onClick={() => onMonthClick(year, month)}
        aria-label={`View all sessions for ${MONTH_NAMES[month - 1]} ${year}`}
      >
        <span className={styles.monthName}>{MONTH_NAMES[month - 1]}</span>
        <span className={styles.yearLabel}>{year}</span>
        {sessionCount > 0 && (
          <span className={styles.sessionBadge}>{sessionCount} session{sessionCount !== 1 ? "s" : ""}</span>
        )}
        <span className={styles.viewHint}>view all ↗</span>
      </button>

      {/* Day-of-week labels */}
      <div className={styles.dayLabels}>
        {DAY_LABELS.map(d => <span key={d} className={styles.dayLabel}>{d}</span>)}
      </div>

      {/* Calendar grid */}
      <div className={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <span key={`e-${idx}`} className={styles.emptyCell} />;

          const mm = String(month).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const isoKey = `${year}-${mm}-${dd}`;
          const entries = dateMap.get(isoKey) ?? [];
          const count = entries.length;
          const isToday = isCurrentMonth && today.getDate() === day;
          const isHovered = hoveredDate === isoKey;
          const localDate = new Date(year, month - 1, day);

          return (
            <div
              key={day}
              className={`
                ${styles.dayCell}
                ${count > 0 ? styles.dayCellActive : ""}
                ${isToday ? styles.dayCellToday : ""}
              `}
              onMouseEnter={() => count > 0 && setHoveredDate(isoKey)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => count > 0 && onDayClick(localDate, entries)}
              role={count > 0 ? "button" : undefined}
              tabIndex={count > 0 ? 0 : undefined}
              onKeyDown={count > 0 ? (e) => { if (e.key === "Enter" || e.key === " ") onDayClick(localDate, entries); } : undefined}
            >
              {/* ── Cell rendering by entry count ── */}
              {count === 0 && (
                <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ""}`}>{day}</span>
              )}

              {count === 1 && (
                <span
                  className={styles.solidCell}
                  style={{ "--c-bg": `var(--accent-${CLASS_ACCENT[entries[0].classType]}-bg)`, "--c-text": `var(--accent-${CLASS_ACCENT[entries[0].classType]}-text)` } as React.CSSProperties}
                >
                  {day}
                </span>
              )}

              {count === 2 && (
                <span className={styles.splitCell}>
                  <span className={styles.splitL} style={{ "--c": `var(--accent-${CLASS_ACCENT[entries[0].classType]}-bg)` } as React.CSSProperties} />
                  <span className={styles.splitR} style={{ "--c": `var(--accent-${CLASS_ACCENT[entries[1].classType]}-bg)` } as React.CSSProperties} />
                  <span className={styles.splitNum}>{day}</span>
                </span>
              )}

              {count >= 3 && (
                <span className={styles.multiCell}>
                  <span className={styles.multiNum}>{day}</span>
                  <span className={styles.dots}>
                    {entries.slice(0, 4).map((e, i) => (
                      <span
                        key={i}
                        className={styles.dot}
                        style={{ background: `var(--accent-${CLASS_ACCENT[e.classType]})` }}
                      />
                    ))}
                    {entries.length > 4 && <span className={styles.dotMore}>+</span>}
                  </span>
                </span>
              )}

              {/* Hover tooltip */}
              {count > 0 && isHovered && (
                <div className={styles.tooltip}>
                  {entries.map((e, i) => (
                    <div key={i} className={styles.tooltipRow}>
                      <span className={styles.tooltipDot} style={{ background: `var(--accent-${CLASS_ACCENT[e.classType]})` }} />
                      <div className={styles.tooltipInfo}>
                        <span className={styles.tooltipClass}>{e.classType}</span>
                        <span className={styles.tooltipName}>{getFacilitatorDisplay(e)}</span>
                        {e.topic && e.topic !== "Session" && (
                          <span className={styles.tooltipTopic}>{truncate(e.topic, 28)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sessionCount === 0 && (
        <p className={styles.empty}>No sessions this month</p>
      )}
    </div>
  );
}
