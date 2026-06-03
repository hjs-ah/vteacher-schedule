"use client";
import { useEffect } from "react";
import {
  ScheduleEntry, CLASS_ACCENT, MONTH_NAMES, DAY_LABELS,
  parseLocalDate, getFacilitatorDisplay, expandEntryDates,
  FULL_WEEKDAY, toISODate,
} from "./types";
import styles from "./MonthSummaryModal.module.css";

type Props = {
  year: number;
  month: number;
  entries: ScheduleEntry[];   // original entries with dateEnd intact
  onClose: () => void;
};

export default function MonthSummaryModal({ year, month, entries, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  // Split into range (ownership) entries and specific-date entries
  type OwnerRow = { entry: ScheduleEntry; dayLabel: string; count: number };
  const ownerRows: OwnerRow[] = [];
  const specificDateMap = new Map<string, ScheduleEntry[]>();

  for (const e of entries) {
    if (e.dateEnd) {
      const dates = expandEntryDates(e).filter(iso => {
        const d = parseLocalDate(iso);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      if (dates.length === 0) continue;
      const fullDay = FULL_WEEKDAY[e.classType];
      ownerRows.push({
        entry: e,
        dayLabel: fullDay ? `All ${fullDay}` : `${dates.length} session${dates.length !== 1 ? "s" : ""}`,
        count: dates.length,
      });
    } else {
      const d = parseLocalDate(e.date);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
      if (!specificDateMap.has(e.date)) specificDateMap.set(e.date, []);
      specificDateMap.get(e.date)!.push(e);
    }
  }

  // Deduplicate ownership rows
  const seen = new Set<string>();
  const uniqueOwnerRows = ownerRows.filter(r => {
    const key = `${r.entry.classType}::${r.entry.facilitator}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const classOrder = ["Preaching","Bible Study","Bible Foundation","Discipleship Class","Testimony","New Members Class","Men's Weekly Study"];
  uniqueOwnerRows.sort((a, b) => classOrder.indexOf(a.entry.classType) - classOrder.indexOf(b.entry.classType));

  const dateGroups = [...specificDateMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalOwned = uniqueOwnerRows.reduce((s, r) => s + r.count, 0);
  const totalSpecific = [...specificDateMap.values()].reduce((s, arr) => s + arr.length, 0);
  const total = totalOwned + totalSpecific;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{MONTH_NAMES[month - 1]} {year}</h2>
            <p className={styles.modalSubtitle}>{total} session{total !== 1 ? "s" : ""}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.scrollArea}>
          {total === 0 && <p className={styles.empty}>No sessions scheduled this month.</p>}

          {/* Monthly assignments — one row per facilitator/class */}
          {uniqueOwnerRows.length > 0 && (
            <div className={styles.ownerSection}>
              <span className={styles.sectionLabel}>Monthly Assignments</span>
              {uniqueOwnerRows.map((row, i) => {
                const accent = CLASS_ACCENT[row.entry.classType];
                return (
                  <div key={i} className={styles.ownerRow}>
                    <span className={styles.ownerBar} style={{ background: `var(--accent-${accent})` }} />
                    <div className={styles.ownerInfo}>
                      <div className={styles.ownerTop}>
                        <span className={styles.ownerClass}>{row.entry.classType}</span>
                        <span className={styles.ownerDayTag}>{row.dayLabel}</span>
                      </div>
                      <span className={styles.ownerFacilitator}>{getFacilitatorDisplay(row.entry)}</span>
                      {row.entry.topic && row.entry.topic !== "Session" && (
                        <span className={styles.ownerTopic}>{row.entry.topic}</span>
                      )}
                      {row.entry.notes && <span className={styles.ownerNotes}>{row.entry.notes}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Specific dates */}
          {dateGroups.length > 0 && (
            <div className={styles.specificSection}>
              {uniqueOwnerRows.length > 0 && <span className={styles.sectionLabel}>Specific Sessions</span>}
              {dateGroups.map(([dateStr, group]) => {
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
                              <span className={styles.sessionFacilitator}>{getFacilitatorDisplay(entry)}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
