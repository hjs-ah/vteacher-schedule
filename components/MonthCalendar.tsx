"use client";
import { useState } from "react";
import { ScheduleEntry, MONTH_NAMES, DAY_LABELS, getInitials, truncate } from "./types";
import styles from "./MonthCalendar.module.css";

type Props = {
  year: number;
  month: number;
  accent: string;
  activeDates: Map<string, ScheduleEntry>; // dateString → entry
  onDayClick: (date: Date, entry: ScheduleEntry) => void;
};

export default function MonthCalendar({ year, month, accent, activeDates, onDayClick }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Total cells: pad to complete weeks
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  return (
    <div className={styles.card}>
      {/* Month header */}
      <div className={styles.monthHeader}>
        <span className={styles.monthName}>{MONTH_NAMES[month - 1]}</span>
        <span className={styles.yearLabel}>{year}</span>
      </div>

      {/* Day-of-week labels */}
      <div className={styles.dayLabels}>
        {DAY_LABELS.map((d) => (
          <span key={d} className={styles.dayLabel}>{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <span key={`e-${idx}`} className={styles.emptyCell} />;
          }

          const date = new Date(year, month - 1, day);
          const dateStr = date.toDateString();
          const entry = activeDates.get(dateStr);
          const isToday = isCurrentMonth && today.getDate() === day;
          const isHovered = hoveredDate === dateStr;

          return (
            <div
              key={day}
              className={`${styles.dayCell} ${entry ? styles.dayCellActive : ""} ${isToday ? styles.dayCellToday : ""}`}
              style={entry ? {
                "--accent-color": `var(--accent-${accent})`,
                "--accent-bg": `var(--accent-${accent}-bg)`,
                "--accent-text": `var(--accent-${accent}-text)`,
              } as React.CSSProperties : undefined}
              onMouseEnter={() => entry && setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => entry && onDayClick(date, entry)}
              role={entry ? "button" : undefined}
              tabIndex={entry ? 0 : undefined}
              onKeyDown={entry ? (e) => { if (e.key === "Enter" || e.key === " ") onDayClick(date, entry); } : undefined}
              aria-label={entry ? `${MONTH_NAMES[month - 1]} ${day}: ${entry.topic} — ${entry.facilitator}` : undefined}
            >
              <span className={styles.dayNumber}>{day}</span>

              {/* Hover tooltip */}
              {entry && isHovered && (
                <div className={styles.tooltip}>
                  <span className={styles.tooltipTopic}>{truncate(entry.topic, 22)}</span>
                  <span className={styles.tooltipFacilitator}>{getInitials(entry.facilitator)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state for this month */}
      {activeDates.size === 0 && (
        <p className={styles.noEntries}>No schedule entered</p>
      )}
    </div>
  );
}
