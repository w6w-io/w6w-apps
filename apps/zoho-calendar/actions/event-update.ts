import type { ActionDefinition } from "@w6w/types";
import { calendarUid, etag, eventDataParams, eventRangeParams, eventUid } from "../lib/params.ts";
import { updateEvent, type UpdateEventInput } from "../lib/events.ts";

interface Input extends UpdateEventInput {
  calendarUid: string;
  eventUid: string;
}

/**
 * `PUT /calendars/<uid>/events/<uid>` — **replaces the whole event**, it does not patch (Zoho's own
 * words: "overwriting all existing fields with the values provided in the request"). Fetch the
 * event first (Get Event) and pass every field you want to keep, not just the ones you're
 * changing — see `lib/events.ts`.
 */
const eventUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "event-update",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Replace an existing event. This OVERWRITES every field with what you send here " +
    "— fields you omit are cleared, not left alone. Fetch the event first (Get Event) if you " +
    "only mean to change one thing. `start`, `end` and `etag` are required.",
  idempotent: true,
  params: [
    calendarUid,
    eventUid,
    { ...eventRangeParams[0], required: true },
    { ...eventRangeParams[1], required: true },
    etag,
    ...eventDataParams,
    {
      key: "recurrenceId",
      label: "Recurrence ID",
      type: "string",
      hint: "Modify one instance of a recurring event (and optionally its future instances via " +
        "Recurrence edit type). ICS format.",
    },
    {
      key: "recurrenceEditType",
      label: "Recurrence edit type",
      type: "select",
      options: [
        { value: "only", label: "Only this occurrence" },
        { value: "following", label: "This and future occurrences" },
        { value: "all", label: "All occurrences (default)" },
      ],
    },
    { key: "isRep", label: "Is recurring", type: "boolean" },
    {
      key: "rmAttachId",
      label: "Remove attachment IDs",
      type: "string",
      hint: "Comma-separated file IDs to detach from the event.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Event UID" },
    { key: "etag", type: "string", label: "ETag" },
  ],

  execute(input, ctx) {
    return updateEvent(ctx, input.calendarUid, input.eventUid, input);
  },
};

export default eventUpdate;
