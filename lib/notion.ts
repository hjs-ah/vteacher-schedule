import { Client, isFullPage } from "@notionhq/client";

export type ClassType =
  | "Preaching"
  | "Bible Study"
  | "Bible Foundation"
  | "Discipleship Class"
  | "New Members Class"
  | "Men's Weekly Study"
  | "Testimony";

export type ScheduleEntry = {
  id: string;
  classType: ClassType;
  date: string;
  dateEnd?: string;
  facilitator: string;
  facilitator2?: string;
  topic: string;
  notes?: string;
};

const DS_ENV: Record<ClassType, string> = {
  "Preaching":          "NOTION_DS_PREACHING",
  "Bible Study":        "NOTION_DS_BIBLE_STUDY",
  "Bible Foundation":   "NOTION_DS_BIBLE_FOUNDATION",
  "Discipleship Class": "NOTION_DS_DISCIPLESHIP",
  "New Members Class":  "NOTION_DS_NEW_MEMBERS",
  "Men's Weekly Study": "NOTION_DS_MENS_STUDY",
  "Testimony":          "NOTION_DS_TESTIMONY",
};

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function queryDataSource(dsId: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let cursor: string | undefined;
  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (notion.dataSources as any).query({
      data_source_id: dsId,
      page_size: 100,
      sorts: [{ property: "Date", direction: "ascending" }],
      ...(cursor ? { start_cursor: cursor } : {}),
    }) as { results: unknown[]; has_more?: boolean; next_cursor?: string };
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return all;
}

function getText(props: Record<string, unknown>, key: string): string {
  const p = props[key] as { rich_text?: Array<{ plain_text: string }> } | undefined;
  return p?.rich_text?.[0]?.plain_text ?? "";
}

function extractEntries(pages: unknown[], classType: ClassType): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  for (const page of pages) {
    if (!isFullPage(page as Parameters<typeof isFullPage>[0])) continue;
    const props = (page as { properties: Record<string, unknown> }).properties;

    const titleProp = props["Topic"] as { title?: Array<{ plain_text: string }> } | undefined;
    const topic = titleProp?.title?.[0]?.plain_text ?? "";

    const facilitator  = getText(props, "Facilitator");
    const facilitator2 = getText(props, "Facilitator 2");

    const dateProp = props["Date"] as { date?: { start: string; end?: string | null } } | undefined;
    const date    = dateProp?.date?.start ?? "";
    const dateEnd = dateProp?.date?.end ?? undefined;

    const notes = getText(props, "Notes");

    if (!facilitator || !date) continue;

    entries.push({
      id: (page as { id: string }).id,
      classType,
      date,
      ...(dateEnd     ? { dateEnd }      : {}),
      ...(facilitator2 ? { facilitator2 } : {}),
      facilitator,
      topic: topic || "Session",
      notes,
    });
  }
  return entries;
}

export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  const classTypes = Object.keys(DS_ENV) as ClassType[];
  const results = await Promise.allSettled(
    classTypes.map(async (ct) => {
      const dsId = process.env[DS_ENV[ct]];
      if (!dsId) return [];
      return extractEntries(await queryDataSource(dsId), ct);
    })
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
