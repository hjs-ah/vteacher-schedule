"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ScheduleEntry, ClassType, CLASS_LABELS, CLASS_WEEKDAY, FULL_WEEKDAY,
  CLASS_ACCENT, MONTH_NAMES, getWeekdayDatesInMonth,
} from "./types";
import MonthCalendar from "./MonthCalendar";
import EventModal from "./EventModal";
import styles from "./ScheduleApp.module.css";

type ActiveEvent = { date: Date; entry: ScheduleEntry };
type DiagStatus = "idle" | "checking" | "ok" | "error";

export default function ScheduleApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [monthCount, setMonthCount] = useState<2 | 3>(2);
  const [classFilter, setClassFilter] = useState<ClassType | "All">("All");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);

  // Diagnostic state
  const [diagStatus, setDiagStatus] = useState<DiagStatus>("idle");
  const [diagMsg, setDiagMsg] = useState<string>("");
  const [showDiag, setShowDiag] = useState(false);

  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth() + 1;

  const monthSlots = Array.from({ length: monthCount }, (_, i) => {
    const totalMonth = baseMonth + i;
    const year = baseYear + Math.floor((totalMonth - 1) / 12);
    const month = ((totalMonth - 1) % 12) + 1;
    return { year, month };
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vow-theme") as "light" | "dark" | null;
      if (saved) {
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vow-theme", next); } catch {}
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries(data.entries ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      console.error("Schedule fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // Diagnostic check
  const runDiagnostic = async () => {
    setDiagStatus("checking");
    setShowDiag(true);
    setDiagMsg("Checking API…");
    try {
      const res = await fetch("/api/schedule");
      const raw = await res.text();
      let parsed: { entries?: ScheduleEntry[]; error?: string } = {};
      try { parsed = JSON.parse(raw); } catch { throw new Error("API returned non-JSON: " + raw.slice(0, 200)); }

      if (!res.ok || parsed.error) {
        throw new Error(parsed.error ?? `HTTP ${res.status}`);
      }

      const count = parsed.entries?.length ?? 0;
      const types = [...new Set(parsed.entries?.map(e => e.classType) ?? [])];
      const facilitators = [...new Set(parsed.entries?.map(e => e.facilitator) ?? [])].length;

      setDiagMsg(
        `✓ API reachable\n✓ ${count} entries loaded\n✓ ${facilitators} facilitators\n✓ Class types: ${types.join(", ") || "none"}`
      );
      setDiagStatus("ok");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDiagMsg(`✗ ${msg}\n\nCheck: NOTION_TOKEN and NOTION_DATABASE_ID are set in Vercel env vars.`);
      setDiagStatus("error");
    }
  };

  const visibleClasses: ClassType[] = classFilter === "All" ? CLASS_LABELS : [classFilter];

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
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
            <button
              className={styles.diagBtn}
              onClick={runDiagnostic}
              aria-label="Run connection diagnostic"
              title="Check data connection"
            >
              {diagStatus === "checking" ? "…" : diagStatus === "ok" ? "✓" : diagStatus === "error" ? "!" : "⚙"}
            </button>
          </div>
        </div>
      </header>

      {/* Diagnostic panel */}
      {showDiag && (
        <div className={`${styles.diagPanel} ${diagStatus === "ok" ? styles.diagOk : diagStatus === "error" ? styles.diagError : styles.diagChecking}`}>
          <div className={styles.diagInner}>
            <pre className={styles.diagMsg}>{diagMsg || "Running…"}</pre>
            <button className={styles.diagClose} onClick={() => setShowDiag(false)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legendBar}>
        {CLASS_LABELS.map((c) => (
          <span key={c} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: `var(--accent-${CLASS_ACCENT[c]})` }} />
            {c}
          </span>
        ))}
      </div>

      {/* Main content */}
      <main className={styles.main}>
        {loading && (
          <div className={styles.statusMsg}>
            <span className={styles.spinner} />
            Loading schedule…
          </div>
        )}
        {error && !loading && (
          <div className={styles.errorMsg}>
            <strong>Could not load schedule</strong>
            <p>{error}</p>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem" }}>
              <button className={styles.retryBtn} onClick={fetchSchedule}>Retry</button>
              <button className={styles.retryBtn} onClick={runDiagnostic}>Run Diagnostic</button>
            </div>
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className={styles.emptyState}>
            <p>No schedule entries found.</p>
            <p style={{ fontSize: "0.8rem", marginTop: "0.4rem", opacity: 0.7 }}>
              Make sure NOTION_TOKEN and NOTION_DATABASE_ID are set and the integration is connected to the database.
            </p>
            <button className={styles.retryBtn} style={{ marginTop: "0.75rem" }} onClick={runDiagnostic}>Run Diagnostic</button>
          </div>
        )}
        {!loading && !error && entries.length > 0 && (
          <>
            {visibleClasses.map((classType) => {
              const weekday = CLASS_WEEKDAY[classType];
              const accent = CLASS_ACCENT[classType];
              const fullDay = FULL_WEEKDAY[classType];
              const classEntries = entries.filter((e) => e.classType === classType);

              if (classFilter === "All" && classEntries.length === 0) return null;

              return (
                <section key={classType} className={styles.classSection}>
                  <div className={styles.classSectionHeader}>
                    <span className={styles.classDot} style={{ background: `var(--accent-${accent})` }} />
                    <h2 className={styles.classSectionTitle}>{classType}</h2>
                    {fullDay && (
                      <span className={styles.classDayBadge} style={{
                        background: `var(--accent-${accent}-bg)`,
                        color: `var(--accent-${accent}-text)`,
                      }}>
                        {fullDay}
                      </span>
                    )}
                    <span className={styles.entryCount}>{classEntries.length} entr{classEntries.length === 1 ? "y" : "ies"}</span>
                  </div>

                  <div className={styles.monthGrid} style={{
                    gridTemplateColumns: `repeat(${monthCount}, 1fr)`,
                  }}>
                    {monthSlots.map(({ year, month }) => {
                      const activeDates: Map<string, ScheduleEntry> = new Map();

                      if (weekday >= 0) {
                        // For Preaching/Testimony: multiple facilitators can share a month
                        // show first matched entry on each weekday occurrence
                        const monthEntries = classEntries.filter(
                          (e) => e.month === month && e.year === year
                        );
                        if (monthEntries.length > 0) {
                          const dates = getWeekdayDatesInMonth(year, month, weekday);
                          dates.forEach((d, i) => {
                            const entry = monthEntries[i % monthEntries.length];
                            activeDates.set(d.toDateString(), entry);
                          });
                        }
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

      <footer className={styles.footer}>
        <p>Verity Outreach Worship Center · Schedule updated every 5 minutes · All times Eastern</p>
        {!loading && !error && (
          <p className={styles.footerCount}>{entries.length} assignments loaded</p>
        )}
      </footer>

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
