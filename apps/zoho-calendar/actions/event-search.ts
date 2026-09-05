import type { ActionDefinition } from "@w6w/types";
import { calendarUid } from "../lib/params.ts";
import { ZohoCalendarClient } from "../lib/client.ts";

interface Input {
  calendarUid: string;
  searchText: string;
  start: string;
  end: string;
}

/**
 * `GET /calendars/<uid>/search` — searches event titles within one calendar. Zoho documents the
 * window as bounded to three months (verified 2026-09-05 against `get-event-through-search.html`);
 * this app does not enforce that client-side, so a wider window simply gets Zoho's own rejection.
 */
const eventSearch: ActionDefinition<Input, Record<string, unknown>> = {
  key: "event-search",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search event titles in one calendar within a date range (max 3 months).",
  params: [
    calendarUid,
    { key: "searchText", label: "Search text", type: "string", required: true },
    {
      key: "start",
      label: "Range start",
      type: "string",
      required: true,
      hint: "yyyyMMdd'T'HHmmss'Z' (GMT).",
    },
    {
      key: "end",
      label: "Range end",
      type: "string",
      required: true,
      hint: "yyyyMMdd'T'HHmmss'Z' (GMT). Within three months of Range start.",
    },
  ],
  output: [{ key: "events", type: "array", label: "Matching events" }],

  execute(input, ctx) {
    return new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(input.calendarUid)}/search`,
      {
        query: {
          searchtext: input.searchText,
          calendaruid: input.calendarUid,
          start: input.start,
          end: input.end,
        },
      },
    );
  },
};

export default eventSearch;
