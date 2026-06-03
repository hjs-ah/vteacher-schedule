import { Suspense } from "react";
import ScheduleApp from "@/components/ScheduleApp";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "DM Sans, sans-serif" }}>Loading schedule…</div>}>
      <ScheduleApp />
    </Suspense>
  );
}
