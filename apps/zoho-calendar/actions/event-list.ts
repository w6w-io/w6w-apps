import type { ActionDefinition } from "@w6w/types";
import { calendarUid } from "../lib/params.ts";
import { type EventListInput, listEvents } from "../lib/events.ts";

interface Input extends EventListInput {
  calendarUid: string;
}

interface Output {
  events: Array<Record<string, unknown>>;
}

/**
 * `GET /calendars/<uid>/events` — bounded by `range` instead of pagination; Zoho caps the window
 * at 31 days (documented, not independently verified here — the app does not enforce it, so a
 * wider window simply gets Zoho's own rejection).
 */
const eventList: ActionDefinition<Input, Output> = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "List events in one calendar within a date range (max 31 days).",
  params: [
    calendarUid,
    {
      key: "start",
      label: "Range start",
      type: "string",
      required: true,
      hint: "yyyyMMdd'T'HHmmss'Z' (or yyyyMMdd for an all-day event), e.g. \"20240115T000000Z\".",
    },
    {
      key: "end",
      label: "Range end",
      type: "string",
      required: true,
      hint: "Same format as Range start. The window cannot exceed 31 days.",
    },
    {
      key: "byInstance",
      label: "Expand recurring instances",
      type: "boolean",
      hint: "When true, every occurrence of a repeating event is listed separately (minimal " +
        "fields only).",
    },
    { key: "timezone", label: "Timezone", type: "string" },
    {
      key: "crmEventType",
      label: "CRM event type",
      type: "select",
      options: [{ value: "own", label: "Own" }, { value: "all", label: "All" }],
      hint: "Only relevant for calendars synced from Zoho CRM.",
    },
  ],
  output: [{ key: "events", type: "array", label: "Events" }],

  async execute(input, ctx) {
    return { events: await listEvents(ctx, input.calendarUid, input) };
  },
};

export default eventList;
