"use client";
import { useEffect } from "react";
import { ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, DAY_LABELS, parseLocalDate } from "./types";
import styles from "./MonthSummaryModal.module.css";

type Props = {
  year: number;
  month: number;
  entries: ScheduleEntry[];
  onClose: () => void;
};

export default function MonthSummaryModal({ year, month, entries, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  // Sort entries by date
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Group by date
  const byDate = new Map<string, ScheduleEntry[]>();
  for (const e of sorted) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{MONTH_NAMES[month - 1]} {year}</h2>
            <p className={styles.modalSubtitle}>
              {entries.length} session{entries.length !== 1 ? "s" : ""} across {byDate.size} date{byDate.size !== 1 ? "s" : ""}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.scrollArea}>
          {byDate.size === 0 && <p className={styles.empty}>No sessions scheduled this month.</p>}
          {[...byDate.entries()].map(([dateStr, group]) => {
            const d = parseLocalDate(dateStr);
            return (
              <div key={dateStr} className={styles.dateGroup}>
                <div className={styles.dateLabel}>
                  <span className={styles.dateDayName}>{DAY_LABELS[d.getDay()]}</span>
                  <span className={styles.dateDayNum}>{d.getDate()}</span>
                </div>
                <div className={styles.sessionList}>
                  {group.map((entry, i) => {
                    const accent = CLASS_ACCENT[entry.classType];
                    return (
                      <div key={`${entry.id}-${i}`} className={styles.sessionCard}>
                        <span className={styles.sessionTypeDot} style={{ background: `var(--accent-${accent})` }} />
                        <div className={styles.sessionInfo}>
                          <span className={styles.sessionClass}>{entry.classType}</span>
                          <span className={styles.sessionFacilitator}>{entry.facilitator}</span>
                          {entry.topic && entry.topic !== "Session" && (
                            <span className={styles.sessionTopic}>{entry.topic}</span>
                          )}
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
      </div>
    </div>
  );
}
