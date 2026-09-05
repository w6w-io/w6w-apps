import type { ActionDefinition } from "@w6w/types";
import { calendarUid, eventDataParams, eventRangeParams } from "../lib/params.ts";
import { createEvent, type EventDataInput } from "../lib/events.ts";

interface Input extends EventDataInput {
  calendarUid: string;
}

/** `POST /calendars/<uid>/events` — `dateandtime.start`/`end` are Zoho's only mandatory fields. */
const eventCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a new event in one calendar. `start` and `end` are required.",
  idempotent: false,
  params: [
    calendarUid,
    { ...eventRangeParams[0], required: true },
    { ...eventRangeParams[1], required: true },
    ...eventDataParams,
  ],
  output: [
    { key: "uid", type: "string", label: "Event UID" },
    { key: "etag", type: "string", label: "ETag" },
  ],

  execute(input, ctx) {
    return createEvent(ctx, input.calendarUid, input);
  },
};

export default eventCreate;
