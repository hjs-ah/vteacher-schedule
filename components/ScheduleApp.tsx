"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ScheduleEntry, ClassType, CLASS_LABELS, ALL_MINISTERS,
  CLASS_ACCENT, MONTH_NAMES, parseLocalDate, expandEntryDates,
  entryMatchesMinister,
} from "./types";
import UnifiedCalendar from "./UnifiedCalendar";
import ListView from "./ListView";
import EventModal from "./EventModal";
import MonthSummaryModal from "./MonthSummaryModal";
import styles from "./ScheduleApp.module.css";

type ViewMode = "calendar" | "list";
type ActiveEvent = { date: Date; entries: ScheduleEntry[] };
type MonthModal = { year: number; month: number; entries: ScheduleEntry[] };
type DiagStatus = "idle" | "checking" | "ok" | "error";

export default function ScheduleApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [monthCount, setMonthCount] = useState<1 | 2 | 3 | 6>(1);
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

  // monthOffset allows prev/next navigation in single-month view
  const [monthOffset, setMonthOffset] = useState(0);

  const monthSlots = useMemo(() =>
    Array.from({ length: monthCount }, (_, i) => {
      const total = baseMonth + monthOffset + i;
      return {
        year: baseYear + Math.floor((total - 1) / 12),
        month: ((total - 1) % 12) + 1,
      };
    }),
    [monthCount, monthOffset, baseYear, baseMonth]
  );

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

  // Reset offset when switching month count
  const handleSetMonthCount = (n: 1 | 2 | 3 | 6) => { setMonthCount(n); setMonthOffset(0); };

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

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (classFilters.size > 0) result = result.filter(e => classFilters.has(e.classType));
    if (ministerFilter) result = result.filter(e => entryMatchesMinister(e, ministerFilter));
    return result;
  }, [entries, classFilters, ministerFilter]);

  // ── Build unified date → entries[] map (expand ranges) ────────────────────
  const unifiedDateMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of filteredEntries) {
      for (const iso of expandEntryDates(e)) {
        // Only single-date entry overrides range entry for same class on same day
        const existing = map.get(iso) ?? [];
        const sameClass = existing.find(x => x.classType === e.classType);
        if (sameClass) {
          if (!e.dateEnd && sameClass.dateEnd) {
            // Replace range with specific
            map.set(iso, [...existing.filter(x => x.classType !== e.classType), e]);
          }
          // else keep existing
        } else {
          map.set(iso, [...existing, e]);
        }
      }
    }
    return map;
  }, [filteredEntries]);

  const handleMonthClick = (year: number, month: number) => {
    // Pass original entries (with dateEnd) so modal can collapse range rows
    const monthEntries = filteredEntries.filter(e => {
      const d = parseLocalDate(e.date);
      // Range entry: include if it overlaps this month
      if (e.dateEnd) {
        const start = parseLocalDate(e.date);
        const end = parseLocalDate(e.dateEnd);
        const mStart = new Date(year, month - 1, 1);
        const mEnd = new Date(year, month, 0);
        return start <= mEnd && end >= mStart;
      }
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    setMonthModal({ year, month, entries: monthEntries });
  };

  const anyFilterActive = classFilters.size > 0 || ministerFilter !== null;
  const totalSessions = [...unifiedDateMap.values()].reduce((sum, arr) => sum + arr.length, 0);

  // List view receives original filtered entries (with dateEnd intact)
  // so it can collapse range entries into month-level summary rows
  const listEntries = filteredEntries;

  return (
    <div className={styles.root}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <h1 className={styles.siteTitle}>VOW Center</h1>
            <p className={styles.siteSubtitle}>Teaching Schedule</p>
          </div>
          <div className={styles.headerControls}>
            {/* View toggle */}
            <div className={styles.viewToggle}>
              <button
                className={viewMode === "calendar" ? styles.viewBtnActive : styles.viewBtn}
                onClick={() => setViewMode("calendar")}
                aria-pressed={viewMode === "calendar"}
              >
                <span className={styles.viewIcon}>▦</span> Calendar
              </button>
              <button
                className={viewMode === "list" ? styles.viewBtnActive : styles.viewBtn}
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                <span className={styles.viewIcon}>☰</span> List
              </button>
            </div>

            {/* Month count — visible in both views */}
            <div className={styles.monthToggle}>
              {([1, 2, 3, 6] as const).map(n => (
                <button
                  key={n}
                  className={monthCount === n ? styles.toggleBtnActive : styles.toggleBtn}
                  onClick={() => handleSetMonthCount(n)}
                >{n} mo</button>
              ))}
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

      {/* ── Diagnostic ── */}
      {showDiag && (
        <div className={`${styles.diagPanel} ${diagStatus === "ok" ? styles.diagOk : diagStatus === "error" ? styles.diagError : styles.diagChecking}`}>
          <div className={styles.diagInner}>
            <pre className={styles.diagMsg}>{diagMsg || "Running…"}</pre>
            <button className={styles.diagClose} onClick={() => setShowDiag(false)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className={styles.filterSection}>
        {/* Class chips */}
        <div className={styles.filterBar}>
          <span className={styles.filterLabel}>
            {anyFilterActive
              ? `${classFilters.size + (ministerFilter ? 1 : 0)} filter${classFilters.size + (ministerFilter ? 1 : 0) > 1 ? "s" : ""} active`
              : "Filter by class"}
          </span>
          <div className={styles.filterChips}>
            {CLASS_LABELS.map(c => {
              const active = classFilters.has(c);
              const accent = CLASS_ACCENT[c];
              return (
                <button key={c}
                  className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                  onClick={() => toggleClassFilter(c)}
                  style={active ? {
                    background: `var(--accent-${accent}-bg)`,
                    color: `var(--accent-${accent}-text)`,
                    borderColor: `var(--accent-${accent})`,
                  } : undefined}
                  aria-pressed={active}
                >
                  <span className={styles.chipDot} style={{ background: `var(--accent-${accent})` }} />
                  {c}
                </button>
              );
            })}
            {anyFilterActive && (
              <button className={styles.clearBtn} onClick={() => { setClassFilters(new Set()); setMinisterFilter(null); }}>
                Clear ✕
              </button>
            )}
          </div>
        </div>

        {/* Roster filter */}
        <div className={styles.rosterSection}>
          <button className={styles.rosterToggle} onClick={() => setShowRoster(v => !v)}>
            <span>{showRoster ? "▾" : "▸"}</span>
            Filter by Minister
            {ministerFilter && <span className={styles.rosterPill}>{ministerFilter}</span>}
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
                  >
                    <span className={styles.rosterInitials}>
                      {name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats row */}
        {!loading && !error && entries.length > 0 && (
          <div className={styles.statsRow}>
            <div className={styles.legend}>
              {CLASS_LABELS.map(c => (
                <span key={c} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: `var(--accent-${CLASS_ACCENT[c]})` }} />
                  {c}
                </span>
              ))}
            </div>
            <span className={styles.sessionTotal}>{totalSessions} session{totalSessions !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <main className={styles.main}>
        {loading && (
          <div className={styles.statusMsg}>
            <span className={styles.spinner} />Loading schedule…
          </div>
        )}
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
            <p style={{ fontSize:"0.8rem", marginTop:"0.4rem", opacity:0.7 }}>
              Check that all NOTION_DS_* env vars are set and each integration is connected to its database.
            </p>
            <button className={styles.retryBtn} style={{ marginTop:"0.75rem" }} onClick={runDiagnostic}>Run Diagnostic</button>
          </div>
        )}

        {!loading && !error && entries.length > 0 && viewMode === "calendar" && (
          <>
            <div className={styles.calendarGrid} style={{ gridTemplateColumns: `repeat(${Math.min(monthCount, 3)}, 1fr)` }}>
              {monthSlots.map(({ year, month }) => {
                const monthMap = new Map<string, ScheduleEntry[]>();
                for (const [iso, dayEntries] of unifiedDateMap.entries()) {
                  const d = parseLocalDate(iso);
                  if (d.getFullYear() === year && d.getMonth() + 1 === month) {
                    monthMap.set(iso, dayEntries);
                  }
                }
                return (
                  <UnifiedCalendar
                    key={`${year}-${month}`}
                    year={year}
                    month={month}
                    dateMap={monthMap}
                    onDayClick={(date, dayEntries) => setActiveEvent({ date, entries: dayEntries })}
                    onMonthClick={handleMonthClick}
                  />
                );
              })}
            </div>
            {monthCount === 1 && (
              <div className={styles.calNav}>
                <button className={styles.calNavBtn} onClick={() => setMonthOffset(o => o - 1)} aria-label="Previous month">
                  ← Prev
                </button>
                <span className={styles.calNavLabel}>
                  {MONTH_NAMES[(((baseMonth + monthOffset - 1) % 12) + 12) % 12]}{" "}
                  {baseYear + Math.floor((baseMonth + monthOffset - 1) / 12)}
                </span>
                <button className={styles.calNavBtn} onClick={() => setMonthOffset(o => o + 1)} aria-label="Next month">
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && entries.length > 0 && viewMode === "list" && (
          <ListView
            entries={listEntries}
            monthSlots={monthSlots}
            onEntryClick={(date, dayEntries) => setActiveEvent({ date, entries: dayEntries })}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <p>Verity Outreach Worship Center · Updates within 5 minutes · All times Eastern</p>
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
