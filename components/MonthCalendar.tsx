"use client";
import { useState } from "react";
import { ScheduleEntry, MONTH_NAMES, DAY_LABELS, truncate, parseLocalDate } from "./types";
import styles from "./MonthCalendar.module.css";

type Props = {
  year: number;
  month: number;
  accent: string;
  dateMap: Map<string, ScheduleEntry>; // ISO date string → entry
  onDayClick: (date: Date, entry: ScheduleEntry) => void;
  onMonthClick: (year: number, month: number) => void;
};

export default function MonthCalendar({ year, month, accent, dateMap, onDayClick, onMonthClick }: Props) {
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

  // Count sessions this month for header hint
  const sessionCount = [...dateMap.keys()].filter(iso => {
    const d = parseLocalDate(iso);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).length;

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

          // Build ISO key: "2026-06-07"
          const mm = String(month).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const isoKey = `${year}-${mm}-${dd}`;
          const entry = dateMap.get(isoKey);
          const isToday = isCurrentMonth && today.getDate() === day;
          const isHovered = hoveredDate === isoKey;
          const localDate = new Date(year, month - 1, day);

          return (
            <div
              key={day}
              className={`${styles.dayCell} ${entry ? styles.dayCellActive : ""} ${isToday ? styles.dayCellToday : ""}`}
              style={entry ? { "--accent-bg": `var(--accent-${accent}-bg)`, "--accent-text": `var(--accent-${accent}-text)` } as React.CSSProperties : undefined}
              onMouseEnter={() => entry && setHoveredDate(isoKey)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => entry && onDayClick(localDate, entry)}
              role={entry ? "button" : undefined}
              tabIndex={entry ? 0 : undefined}
              onKeyDown={entry ? (e) => { if (e.key === "Enter" || e.key === " ") onDayClick(localDate, entry); } : undefined}
              aria-label={entry ? `${MONTH_NAMES[month - 1]} ${day}: ${entry.topic} — ${entry.facilitator}` : undefined}
            >
              <span className={styles.dayNumber}>{day}</span>
              {entry && isHovered && (
                <div className={styles.tooltip}>
                  <span className={styles.tooltipTopic}>{truncate(entry.topic, 24)}</span>
                  <span className={styles.tooltipFacilitator}>{entry.facilitator}</span>
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
