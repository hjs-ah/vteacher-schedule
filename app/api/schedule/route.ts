import { NextResponse } from "next/server";
import { getScheduleEntries } from "@/lib/notion";

export const revalidate = 300; // refresh every 5 minutes

export async function GET() {
  try {
    const entries = await getScheduleEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("Notion fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch schedule data" },
      { status: 500 }
    );
  }
}
