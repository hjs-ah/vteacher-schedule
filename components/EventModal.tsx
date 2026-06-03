"use client";
import { useEffect } from "react";
import { ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, FULL_DAY_NAMES, getFacilitatorDisplay } from "./types";
import styles from "./EventModal.module.css";

type Props = {
  date: Date;
  entries: ScheduleEntry[];   // 1 entry normally, 2 on a split Thursday
  onClose: () => void;
};

export default function EventModal({ date, entries, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const dayName = FULL_DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const multiSession = entries.length > 1;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        <p className={styles.date}>{dayName}, {monthName} {date.getDate()}, {date.getFullYear()}</p>

        {multiSession && (
          <p className={styles.multiLabel}>{entries.length} sessions this day</p>
        )}

        {entries.map((entry, i) => {
          const accent = CLASS_ACCENT[entry.classType];
          return (
            <div
              key={entry.id}
              className={`${styles.entryBlock} ${i > 0 ? styles.entryBlockBordered : ""}`}
            >
              <span className={styles.classBadge} style={{
                background: `var(--accent-${accent}-bg)`,
                color: `var(--accent-${accent}-text)`,
              }}>
                {entry.classType}
              </span>

              {entry.topic && entry.topic !== "Session" && (
                <h2 className={styles.topic}>{entry.topic}</h2>
              )}

              <div className={styles.facilitatorRow}>
                <div className={styles.avatar} style={{
                  background: `var(--accent-${accent}-bg)`,
                  color: `var(--accent-${accent}-text)`,
                }}>
                  {entry.facilitator.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? "").join("").slice(0, 2)}
                </div>
                <div>
                  <p className={styles.facilitatorLabel}>
                    {entry.facilitator2 ? "Speakers" : "Facilitator"}
                  </p>
                  <p className={styles.facilitatorName}>{getFacilitatorDisplay(entry)}</p>
                </div>
              </div>

              {entry.notes && (
                <p className={styles.notes}>{entry.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
