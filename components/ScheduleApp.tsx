"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ScheduleEntry, ClassType, CLASS_LABELS, CLASS_WEEKDAY, CLASS_ACCENT,
  MONTH_NAMES, DAY_LABELS, getWeekdayDatesInMonth, getInitials, truncate,
} from "./types";
import MonthCalendar from "./MonthCalendar";
import EventModal from "./EventModal";
import styles from "./ScheduleApp.module.css";

type ActiveEvent = {
  date: Date;
  entry: ScheduleEntry;
};

export default function ScheduleApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [monthCount, setMonthCount] = useState<2 | 3>(2);
  const [classFilter, setClassFilter] = useState<ClassType | "All">("All");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);

  // Base month: current month
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth() + 1; // 1-indexed

  // Build list of {year, month} to display
  const monthSlots = Array.from({ length: monthCount }, (_, i) => {
    const totalMonth = baseMonth + i;
    const year = baseYear + Math.floor((totalMonth - 1) / 12);
    const month = ((totalMonth - 1) % 12) + 1;
    return { year, month };
  });

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vow-theme") as "light" | "dark" | null;
      if (saved) setTheme(saved);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vow-theme", next); } catch {}
  };

  // Fetch schedule from API
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) throw new Error("Failed to load schedule");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (e) {
      setError("Unable to load schedule. Please try again later.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // Classes to display based on filter
  const visibleClasses: ClassType[] = classFilter === "All"
    ? CLASS_LABELS
    : [classFilter];

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <span className={styles.logoMark}>✦</span>
            <div>
              <h1 className={styles.siteTitle}>VOW Center</h1>
              <p className={styles.siteSubtitle}>Teaching Schedule</p>
            </div>
          </div>
          <div className={styles.headerControls}>
            <select
              className={styles.select}
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value as ClassType | "All")}
              aria-label="Filter by class type"
            >
              <option value="All">All Classes</option>
              {CLASS_LABELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className={styles.monthToggle}>
              <button
                className={monthCount === 2 ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setMonthCount(2)}
              >2 mo</button>
              <button
                className={monthCount === 3 ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setMonthCount(3)}
              >3 mo</button>
            </div>
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className={styles.legendBar}>
        {CLASS_LABELS.map((c) => (
          <span key={c} className={styles.legendItem} data-accent={CLASS_ACCENT[c]}>
            <span className={styles.legendDot} style={{
              background: `var(--accent-${CLASS_ACCENT[c]})`,
            }} />
            {c}
          </span>
        ))}
      </div>

      {/* Main content */}
      <main className={styles.main}>
        {loading && (
          <div className={styles.statusMsg}>Loading schedule…</div>
        )}
        {error && (
          <div className={styles.errorMsg}>{error}</div>
        )}
        {!loading && !error && (
          <>
            {visibleClasses.map((classType) => {
              const weekday = CLASS_WEEKDAY[classType];
              const accent = CLASS_ACCENT[classType];
              const classEntries = entries.filter((e) => e.classType === classType);

              return (
                <section key={classType} className={styles.classSection}>
                  <div className={styles.classSectionHeader} data-accent={accent}>
                    <span className={styles.classDot} style={{ background: `var(--accent-${accent})` }} />
                    <h2 className={styles.classSectionTitle}>{classType}</h2>
                    {weekday >= 0 && (
                      <span className={styles.classDayBadge} style={{
                        background: `var(--accent-${accent}-bg)`,
                        color: `var(--accent-${accent}-text)`,
                      }}>
                        {DAY_LABELS[weekday]}s
                      </span>
                    )}
                  </div>

                  <div className={styles.monthGrid} style={{
                    gridTemplateColumns: `repeat(${monthCount}, 1fr)`,
                  }}>
                    {monthSlots.map(({ year, month }) => {
                      // Build calendar event map for this class + month
                      const entry = classEntries.find(
                        (e) => e.month === month && e.year === year
                      );
                      // For weekday-fixed classes: auto-populate all matching dates
                      const activeDates: Map<string, ScheduleEntry> = new Map();
                      if (entry && weekday >= 0) {
                        const dates = getWeekdayDatesInMonth(year, month, weekday);
                        dates.forEach((d) => {
                          activeDates.set(d.toDateString(), entry);
                        });
                      }
                      // For date-specific classes (New Members, Men's Weekly)
                      if (weekday < 0 && entry) {
                        // These will store specific dates via a "Date" property — not yet fetched
                        // Placeholder: show entry on the 1st of month for now
                      }

                      return (
                        <MonthCalendar
                          key={`${classType}-${year}-${month}`}
                          year={year}
                          month={month}
                          accent={accent}
                          activeDates={activeDates}
                          onDayClick={(date, entry) => setActiveEvent({ date, entry })}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Verity Outreach Worship Center · Schedule updated regularly · All times are Eastern</p>
      </footer>

      {/* Event modal */}
      {activeEvent && (
        <EventModal
          date={activeEvent.date}
          entry={activeEvent.entry}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </div>
  );
}
