import type { ActionDefinition } from "@w6w/types";
import { calendarUid, eventUid } from "../lib/params.ts";
import { getEvent } from "../lib/events.ts";

interface Input {
  calendarUid: string;
  eventUid: string;
  recurrenceId?: string;
}

const eventGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Get one event's details, including its current `etag` (needed to update/delete).",
  params: [
    calendarUid,
    eventUid,
    {
      key: "recurrenceId",
      label: "Recurrence ID",
      type: "string",
      hint: "Retrieve a specific instance of a recurring event, in ICS format " +
        "(yyyyMMdd'T'HHmmss'Z', or yyyyMMdd for an all-day event).",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Event UID" },
    { key: "etag", type: "string", label: "ETag" },
  ],

  execute(input, ctx) {
    return getEvent(ctx, input.calendarUid, input.eventUid, input.recurrenceId);
  },
};

export default eventGet;
