import type { ActionDefinition } from "@w6w/types";
import { unwrapFirst, ZohoCalendarClient } from "../lib/client.ts";

interface Input {
  calendarUid: string;
}

/**
 * `GET /calendars/<uid>` — the one Calendars endpoint that documents a literal alias:
 * `calendarUid` may be a real uid, or the strings `"default"`/`"primary"` for the caller's own
 * default calendar (confirmed live 2026-09-05 against `get-calendar-details.html`).
 */
const calendarGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "calendar-get",
  type: "read",
  resource: "calendar",
  title: "Get Calendar",
  description: "Get one calendar's details by uid.",
  params: [
    {
      key: "calendarUid",
      label: "Calendar UID",
      type: "string",
      required: true,
      default: "primary",
      hint: 'A real calendar `uid` (from List Calendars), or the literal "default"/"primary" for ' +
        "your own default calendar.",
    },
  ],
  output: [{ key: "uid", type: "string", label: "Calendar UID" }],

  async execute(input, ctx) {
    const body = await new ZohoCalendarClient(ctx).request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(input.calendarUid)}`,
    );
    return unwrapFirst(body, "calendars", "get calendar");
  },
};

export default calendarGet;
