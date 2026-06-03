"use client";
import { useEffect } from "react";
import { ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, DAY_LABELS } from "./types";
import styles from "./EventModal.module.css";

type Props = {
  date: Date;
  entry: ScheduleEntry;
  onClose: () => void;
};

export default function EventModal({ date, entry, onClose }: Props) {
  const accent = CLASS_ACCENT[entry.classType];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dayName = DAY_LABELS[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Session details">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Class type badge */}
        <span
          className={styles.classBadge}
          style={{
            background: `var(--accent-${accent}-bg)`,
            color: `var(--accent-${accent}-text)`,
          }}
        >
          {entry.classType}
        </span>

        {/* Date */}
        <p className={styles.date}>
          {dayName}, {monthName} {day}, {year}
        </p>

        {/* Topic */}
        <h2 className={styles.topic}>{entry.topic}</h2>

        {/* Divider */}
        <hr className={styles.divider} />

        {/* Facilitator */}
        <div className={styles.facilitatorRow}>
          <div
            className={styles.avatar}
            style={{
              background: `var(--accent-${accent}-bg)`,
              color: `var(--accent-${accent}-text)`,
            }}
          >
            {entry.facilitator
              .trim()
              .split(/\s+/)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </div>
          <div>
            <p className={styles.facilitatorLabel}>Facilitator</p>
            <p className={styles.facilitatorName}>{entry.facilitator}</p>
          </div>
        </div>

        {/* Notes */}
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
