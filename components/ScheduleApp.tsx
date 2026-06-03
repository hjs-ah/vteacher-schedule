"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ScheduleEntry, ClassType, CLASS_LABELS, FULL_WEEKDAY, ALL_MINISTERS,
  CLASS_ACCENT, MONTH_NAMES, parseLocalDate, expandEntryDates,
  getFacilitatorDisplay, entryMatchesMinister,
} from "./types";
import MonthCalendar from "./MonthCalendar";
import EventModal from "./EventModal";
import MonthSummaryModal from "./MonthSummaryModal";
import styles from "./ScheduleApp.module.css";

type ActiveEvent = { date: Date; entries: ScheduleEntry[] };
type MonthModal = { year: number; month: number; entries: ScheduleEntry[] };
type DiagStatus = "idle" | "checking" | "ok" | "error";

export default function ScheduleApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [monthCount, setMonthCount] = useState<2 | 3>(2);
  const [classFilters, setClassFilters] = useState<Set<ClassType>>(new Set());
  const [ministerFilter, setMinisterFilter] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [monthModal, setMonthModal] = useState<MonthModal | null>(null);
  const [diagStatus, setDiagStatus] = useState<DiagStatus>("idle");
  const [diagMsg, setDiagMsg] = useState<string>("");
  const [showDiag, setShowDiag] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

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
      if (saved) { setTheme(saved); document.documentElement.setAttribute("data-theme", saved); }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vow-theme", next); } catch {}
  };

  const toggleClassFilter = (ct: ClassType) => {
    setClassFilters(prev => {
      const next = new Set(prev);
      next.has(ct) ? next.delete(ct) : next.add(ct);
      return next;
    });
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const runDiagnostic = async () => {
    setDiagStatus("checking"); setShowDiag(true); setDiagMsg("Checking API…");
    try {
      const res = await fetch("/api/schedule");
      const raw = await res.text();
      let parsed: { entries?: ScheduleEntry[]; error?: string } = {};
      try { parsed = JSON.parse(raw); } catch { throw new Error("Non-JSON: " + raw.slice(0, 200)); }
      if (!res.ok || parsed.error) throw new Error(parsed.error ?? `HTTP ${res.status}`);
      const count = parsed.entries?.length ?? 0;
      const types = [...new Set(parsed.entries?.map(e => e.classType) ?? [])];
      const facs = [...new Set(parsed.entries?.map(e => e.facilitator) ?? [])].length;
      setDiagMsg(`✓ API reachable\n✓ ${count} entries loaded\n✓ ${facs} facilitators\n✓ Schedules: ${types.join(", ") || "none"}`);
      setDiagStatus("ok");
    } catch (e) {
      setDiagMsg(`✗ ${e instanceof Error ? e.message : e}\n\nCheck: NOTION_TOKEN and all NOTION_DS_* env vars in Vercel.`);
      setDiagStatus("error");
    }
  };

  // Apply both filters
  const filteredEntries = ministerFilter
    ? entries.filter(e => entryMatchesMinister(e, ministerFilter))
    : entries;

  const visibleClasses = classFilters.size > 0
    ? CLASS_LABELS.filter(c => classFilters.has(c))
    : CLASS_LABELS;

  const handleMonthClick = (year: number, month: number) => {
    const monthEntries = filteredEntries.filter(e => {
      const d = parseLocalDate(e.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    setMonthModal({ year, month, entries: monthEntries });
  };

  const anyFilterActive = classFilters.size > 0 || ministerFilter !== null;

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.siteTitle}>VOW Center</h1>
            <p className={styles.siteSubtitle}>Teaching Schedule</p>
          </div>
          <div className={styles.headerControls}>
            <div className={styles.monthToggle}>
              <button className={monthCount === 2 ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setMonthCount(2)}>2 mo</button>
              <button className={monthCount === 3 ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setMonthCount(3)}>3 mo</button>
            </div>
            <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button className={styles.diagBtn} onClick={runDiagnostic} title="Check data connection">
              {diagStatus === "checking" ? "…" : diagStatus === "ok" ? "✓" : diagStatus === "error" ? "!" : "⚙"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Diagnostic panel ── */}
      {showDiag && (
        <div className={`${styles.diagPanel} ${diagStatus === "ok" ? styles.diagOk : diagStatus === "error" ? styles.diagError : styles.diagChecking}`}>
          <div className={styles.diagInner}>
            <pre className={styles.diagMsg}>{diagMsg || "Running…"}</pre>
            <button className={styles.diagClose} onClick={() => setShowDiag(false)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* ── Class filter chips ── */}
      <div className={styles.filterBar}>
        <span className={styles.filterHint}>
          {anyFilterActive ? `${classFilters.size + (ministerFilter ? 1 : 0)} filter${classFilters.size + (ministerFilter ? 1 : 0) > 1 ? "s" : ""} active` : "Click to filter"}
        </span>
        <div className={styles.filterChips}>
          {CLASS_LABELS.map(c => {
            const active = classFilters.has(c);
            const accent = CLASS_ACCENT[c];
            return (
              <button key={c}
                className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
                onClick={() => toggleClassFilter(c)}
                style={active ? { background: `var(--accent-${accent}-bg)`, color: `var(--accent-${accent}-text)`, borderColor: `var(--accent-${accent})` } : undefined}
                aria-pressed={active}
              >
                <span className={styles.chipDot} style={{ background: `var(--accent-${accent})` }} />
                {c}
              </button>
            );
          })}
          {anyFilterActive && (
            <button className={styles.clearFilters} onClick={() => { setClassFilters(new Set()); setMinisterFilter(null); }}>Clear ✕</button>
          )}
        </div>
      </div>

      {/* ── Roster filter ── */}
      <div className={styles.rosterBar}>
        <button
          className={styles.rosterToggle}
          onClick={() => setShowRoster(v => !v)}
          aria-expanded={showRoster}
        >
          <span className={styles.rosterToggleIcon}>{showRoster ? "▾" : "▸"}</span>
          Filter by Minister
          {ministerFilter && (
            <span className={styles.rosterActiveChip}>{ministerFilter}</span>
          )}
        </button>

        {showRoster && (
          <div className={styles.rosterChips}>
            {ALL_MINISTERS.map(name => {
              const active = ministerFilter === name;
              return (
                <button
                  key={name}
                  className={`${styles.rosterChip} ${active ? styles.rosterChipActive : ""}`}
                  onClick={() => setMinisterFilter(active ? null : name)}
                  aria-pressed={active}
                >
                  <span className={styles.rosterInitials}>
                    {name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
                  </span>
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main ── */}
      <main className={styles.main}>
        {loading && <div className={styles.statusMsg}><span className={styles.spinner} />Loading schedule…</div>}
        {error && !loading && (
          <div className={styles.errorMsg}>
            <strong>Could not load schedule</strong>
            <p>{error}</p>
            <div style={{ display:"flex", gap:"0.6rem", marginTop:"0.75rem" }}>
              <button className={styles.retryBtn} onClick={fetchSchedule}>Retry</button>
              <button className={styles.retryBtn} onClick={runDiagnostic}>Diagnostic</button>
            </div>
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className={styles.emptyState}>
            <p>No schedule entries found.</p>
            <p style={{ fontSize:"0.8rem", marginTop:"0.4rem", opacity:0.7 }}>Check that all NOTION_DS_* env vars are set and each integration is connected to its database.</p>
            <button className={styles.retryBtn} style={{ marginTop:"0.75rem" }} onClick={runDiagnostic}>Run Diagnostic</button>
          </div>
        )}

        {!loading && !error && entries.length > 0 && visibleClasses.map(classType => {
          const accent = CLASS_ACCENT[classType];
          const fullDay = FULL_WEEKDAY[classType];
          const classEntries = filteredEntries.filter(e => e.classType === classType);
          if (classEntries.length === 0) return null;

          // Build date→entries[] map (array to support split cells)
          const dateMap = new Map<string, ScheduleEntry[]>();
          for (const e of classEntries) {
            for (const iso of expandEntryDates(e)) {
              if (!dateMap.has(iso)) dateMap.set(iso, []);
              const existing = dateMap.get(iso)!;
              // Single-date entries take priority over range entries for same class
              if (existing.length === 0 || !e.dateEnd) {
                if (!e.dateEnd) {
                  // Replace range entry with specific
                  dateMap.set(iso, [e]);
                } else if (existing[0]?.dateEnd) {
                  // Both range — keep first
                  if (existing.length === 0) dateMap.set(iso, [e]);
                }
              }
            }
          }
          const totalSessions = dateMap.size;

          return (
            <section key={classType} className={styles.classSection}>
              <div className={styles.classSectionHeader}>
                <span className={styles.classDot} style={{ background: `var(--accent-${accent})` }} />
                <h2 className={styles.classSectionTitle}>{classType}</h2>
                {fullDay && (
                  <span className={styles.classDayBadge} style={{ background:`var(--accent-${accent}-bg)`, color:`var(--accent-${accent}-text)` }}>
                    {fullDay}
                  </span>
                )}
                <span className={styles.entryCount}>{totalSessions} session{totalSessions !== 1 ? "s" : ""}</span>
              </div>
              <div className={styles.monthGrid} style={{ gridTemplateColumns:`repeat(${monthCount}, 1fr)` }}>
                {monthSlots.map(({ year, month }) => (
                  <MonthCalendar
                    key={`${classType}-${year}-${month}`}
                    year={year}
                    month={month}
                    accent={accent}
                    dateMap={dateMap}
                    allEntries={filteredEntries}
                    onDayClick={(date, dayEntries) => setActiveEvent({ date, entries: dayEntries })}
                    onMonthClick={handleMonthClick}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className={styles.footer}>
        <p>Verity Outreach Worship Center · Schedule updates within 5 minutes · All times Eastern</p>
        {!loading && !error && <p className={styles.footerCount}>{entries.length} sessions loaded</p>}
      </footer>

      {activeEvent && (
        <EventModal
          date={activeEvent.date}
          entries={activeEvent.entries}
          onClose={() => setActiveEvent(null)}
        />
      )}
      {monthModal && (
        <MonthSummaryModal
          year={monthModal.year}
          month={monthModal.month}
          entries={monthModal.entries}
          onClose={() => setMonthModal(null)}
        />
      )}
    </div>
  );
}
