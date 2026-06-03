# VOW Center — Teaching Schedule

A clean, ministry teaching schedule built with Next.js, backed by Notion, deployed on Vercel.

---

## Notion Setup

### 1. Create the Integration

1. Go to https://www.notion.so/my-integrations
2. Click + New integration — name it `VOW Schedule`
3. Copy the Internal Integration Token (starts with `secret_...`)
4. Under Capabilities, enable: Read content only

---

### 2. Create the Database

In Notion → Ministry → Projects, create a new full-page database: `Teaching Schedule`

Required properties (exact names matter):

| Property | Type | Notes |
|---|---|---|
| Topic | Title | Default title field — just rename it |
| Class Type | Select | See options below |
| Facilitator | Text | Full name |
| Month | Number | 1–12 |
| Year | Number | e.g. 2026 |
| Notes | Text | Optional |

Class Type select options (add exactly):
- Bible Study
- Bible Foundation
- Discipleship Class
- New Members Class
- Men's Weekly Study

### 3. Connect Integration

Database → ··· → Connections → Connect to → VOW Schedule

### 4. Get Database ID

From the URL: notion.so/workspace/{DATABASE_ID}?v=...

---

## How Admins Enter Data

One row = one class for one month.

For Bible Study / Bible Foundation / Discipleship Class:
- Enter one row per month — the app auto-populates all correct weekdays
- Example: Topic: "Armor of God" | Class Type: Bible Foundation | Facilitator: Antone Harrison | Month: 9 | Year: 2026
  → Shows Antone on every Saturday in September 2026

---

## Vercel Deployment

1. Push to GitHub
2. Import to vercel.com/new (Next.js auto-detected)
3. Add Environment Variables:
   - NOTION_TOKEN = secret_xxxx
   - NOTION_DATABASE_ID = xxxx (no dashes)
4. Deploy

Share the Vercel URL with facilitators — no login needed.

---

## Class Day Mapping

| Class | Day |
|---|---|
| Bible Study | Tuesdays |
| Bible Foundation | Saturdays |
| Discipleship Class | Mondays |
| New Members Class | Month view |
| Men's Weekly Study | Month view |
