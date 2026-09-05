import type { ActionDefinition } from "@w6w/types";
import { unwrapArray, ZohoCalendarClient } from "../lib/client.ts";
import { categoryParam, showHiddenCalParam } from "../lib/params.ts";

interface Input {
  category?: string;
  showHiddenCal?: boolean;
}

interface Output {
  calendars: Array<Record<string, unknown>>;
}

/**
 * `GET /calendars` — the only Calendars endpoint with no documented pagination; it answers every
 * calendar the category filter matches in one response.
 */
const calendarList: ActionDefinition<Input, Output> = {
  key: "calendar-list",
  type: "read",
  resource: "calendar",
  title: "List Calendars",
  description: "List calendars, optionally filtered to one category.",
  params: [categoryParam, showHiddenCalParam],
  output: [{ key: "calendars", type: "array", label: "Calendars" }],

  async execute(input, ctx) {
    const body = await new ZohoCalendarClient(ctx).request<{ calendars?: unknown[] }>(
      "/calendars",
      { query: { category: input.category, showhiddencal: input.showHiddenCal } },
    );
    return { calendars: unwrapArray(body, "calendars") };
  },
};

export default calendarList;
