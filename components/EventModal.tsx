"use client";
import { useEffect } from "react";
import { ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, DAY_LABELS, FULL_DAY_NAMES, parseLocalDate } from "./types";
import styles from "./EventModal.module.css";

type Props = {
  date: Date;
  entry: ScheduleEntry;
  onClose: () => void;
};

export default function EventModal({ date, entry, onClose }: Props) {
  const accent = CLASS_ACCENT[entry.classType];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const dayName = FULL_DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Session details">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        <span className={styles.classBadge} style={{
          background: `var(--accent-${accent}-bg)`,
          color: `var(--accent-${accent}-text)`,
        }}>
          {entry.classType}
        </span>

        <p className={styles.date}>{dayName}, {monthName} {date.getDate()}, {date.getFullYear()}</p>
        <h2 className={styles.topic}>{entry.topic}</h2>

        <hr className={styles.divider} />

        <div className={styles.facilitatorRow}>
          <div className={styles.avatar} style={{
            background: `var(--accent-${accent}-bg)`,
            color: `var(--accent-${accent}-text)`,
          }}>
            {entry.facilitator.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? "").join("")}
          </div>
          <div>
            <p className={styles.facilitatorLabel}>Facilitator</p>
            <p className={styles.facilitatorName}>{entry.facilitator}</p>
          </div>
        </div>

        {entry.notes && (
          <div className={styles.notes}>
            <p className={styles.notesLabel}>Notes</p>
            <p className={styles.notesText}>{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
