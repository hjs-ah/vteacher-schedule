import { Client, isFullPage, isFullPageOrDataSource, collectPaginatedAPI } from "@notionhq/client";

export type ClassType =
  | "Bible Study"
  | "Bible Foundation"
  | "Discipleship Class"
  | "New Members Class"
  | "Men's Weekly Study";

export type ScheduleEntry = {
  id: string;
  classType: ClassType;
  month: number;
  year: number;
  facilitator: string;
  topic: string;
  notes?: string;
};

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function getProp(props: Record<string, unknown>, key: string, type: string): unknown {
  const prop = props[key] as Record<string, unknown> | undefined;
  if (!prop || prop.type !== type) return null;
  return prop;
}

function getRichText(props: Record<string, unknown>, key: string): string {
  const prop = getProp(props, key, "rich_text") as { rich_text: Array<{plain_text: string}> } | null;
  return prop?.rich_text?.[0]?.plain_text ?? "";
}

function getTitle(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as { title: Array<{plain_text: string}> } | undefined;
  return prop?.title?.[0]?.plain_text ?? "";
}

function getSelect(props: Record<string, unknown>, key: string): string {
  const prop = getProp(props, key, "select") as { select: { name: string } } | null;
  return prop?.select?.name ?? "";
}

function getNumber(props: Record<string, unknown>, key: string): number {
  const prop = getProp(props, key, "number") as { number: number } | null;
  return prop?.number ?? 0;
}

export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) throw new Error("NOTION_DATABASE_ID is not set");

  // Use search to query pages in the database
  const response = await notion.search({
    filter: { property: "object", value: "page" },
    sort: { direction: "ascending", timestamp: "last_edited_time" },
  });

  const entries: ScheduleEntry[] = [];

  for (const page of response.results) {
    if (!isFullPage(page)) continue;
    // Filter to only pages from our target database
    const parent = page.parent as { type: string; database_id?: string };
    if (parent.type !== "database_id") continue;
    if (parent.database_id?.replace(/-/g, "") !== databaseId.replace(/-/g, "")) continue;

    const props = page.properties as Record<string, unknown>;

    const topic = getTitle(props, "Topic");
    const facilitator = getRichText(props, "Facilitator");
    const classType = getSelect(props, "Class Type") as ClassType || "Bible Study";
    const month = getNumber(props, "Month");
    const year = getNumber(props, "Year");
    const notes = getRichText(props, "Notes");

    if (!topic || !facilitator || !month || !year) continue;

    entries.push({ id: page.id, classType, month, year, facilitator, topic, notes });
  }

  return entries;
}
