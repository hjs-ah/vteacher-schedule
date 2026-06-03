import { Client, isFullPage } from "@notionhq/client";

export type ClassType =
  | "Bible Study"
  | "Bible Foundation"
  | "Discipleship Class"
  | "New Members Class"
  | "Men's Weekly Study"
  | "Preaching"
  | "Testimony";

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

// The collection/data-source ID for the Teaching Schedule DB
const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID ?? process.env.NOTION_DATABASE_ID ?? "";

function getRichText(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as { type?: string; rich_text?: Array<{ plain_text: string }> } | undefined;
  if (!prop || prop.type !== "rich_text") return "";
  return prop.rich_text?.[0]?.plain_text ?? "";
}

function getTitle(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as { title?: Array<{ plain_text: string }> } | undefined;
  return prop?.title?.[0]?.plain_text ?? "";
}

function getSelect(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as { type?: string; select?: { name: string } } | undefined;
  if (!prop || prop.type !== "select") return "";
  return prop.select?.name ?? "";
}

function getNumber(props: Record<string, unknown>, key: string): number {
  const prop = props[key] as { type?: string; number?: number } | undefined;
  if (!prop || prop.type !== "number") return 0;
  return prop.number ?? 0;
}

async function queryAllPages(): Promise<unknown[]> {
  const allResults: unknown[] = [];
  let cursor: string | undefined;

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (notion.dataSources as any).query({
      data_source_id: DATA_SOURCE_ID,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    }) as { results: unknown[]; next_cursor?: string; has_more?: boolean };

    allResults.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return allResults;
}

export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  if (!DATA_SOURCE_ID) throw new Error("NOTION_DATABASE_ID is not set");

  const pages = await queryAllPages();
  const entries: ScheduleEntry[] = [];

  for (const page of pages) {
    if (!isFullPage(page as Parameters<typeof isFullPage>[0])) continue;
    const p = page as { properties: Record<string, unknown> };
    const props = p.properties;

    const topic = getTitle(props, "Topic");
    const facilitator = getRichText(props, "Facilitator");
    const classType = getSelect(props, "Class Type") as ClassType;
    const month = getNumber(props, "Month");
    const year = getNumber(props, "Year");
    const notes = getRichText(props, "Notes");

    if (!facilitator || !month || !year || !classType) continue;

    entries.push({
      id: (page as { id: string }).id,
      classType,
      month,
      year,
      facilitator,
      topic: topic || "Assignment",
      notes,
    });
  }

  return entries;
}
