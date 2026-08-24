import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact, idRef } from "../lib/client.ts";
import { fieldsParam, refParam } from "../lib/params.ts";

/**
 * `POST /calendar_entries.json` — required: `summary`, `start_at`, `end_at`,
 * `calendar_owner` (verified in the OpenAPI document's create schema).
 * `calendar_owner` is the CALENDAR this entry is filed under (an `{id}` ref
 * to a Calendar resource, not a user) — Clio's naming is easy to misread as
 * "the person who owns it".
 */
interface Input {
  summary: string;
  startAt: string;
  endAt: string;
  calendarId: number;
  description?: string;
  location?: string;
  matterId?: number;
  allDay?: boolean;
  fields?: string;
}

const calendarEntryCreate: ActionDefinition<Input> = {
  key: "calendar-entry-create",
  type: "perform",
  resource: "calendar-entry",
  title: "Create Calendar Entry",
  description: "Create a new calendar entry (event).",
  idempotent: false,
  params: [
    { key: "summary", label: "Summary", type: "string", required: true },
    { key: "startAt", label: "Start", type: "datetime", required: true },
    { key: "endAt", label: "End", type: "datetime", required: true },
    {
      ...refParam("calendarId", "Calendar ID"),
      required: true,
      hint: "The Calendar this entry is filed under (see calendar-entry-list output), not a user.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "location", label: "Location", type: "string" },
    refParam("matterId", "Matter ID"),
    { key: "allDay", label: "All day", type: "boolean" },
    fieldsParam("id,etag,summary,start_at,end_at"),
  ],
  output: [{ key: "data", type: "object", label: "The created calendar entry" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/calendar_entries.json", {
      method: "POST",
      query: { fields: input.fields },
      body: compact({
        summary: input.summary,
        start_at: input.startAt,
        end_at: input.endAt,
        calendar_owner: idRef(input.calendarId),
        description: input.description,
        location: input.location,
        matter: idRef(input.matterId),
        all_day: input.allDay,
      }),
    });
  },
};

export default calendarEntryCreate;
