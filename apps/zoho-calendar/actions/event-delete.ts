import type { ActionDefinition } from "@w6w/types";
import { calendarUid, etag, eventUid } from "../lib/params.ts";
import { deleteEvent, type DeleteEventInput } from "../lib/events.ts";

interface Input extends DeleteEventInput {
  calendarUid: string;
  eventUid: string;
}

const eventDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "event-delete",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description: "Delete an event (or one instance of a recurring event). `etag` is required — " +
    "get the current value from Get Event.",
  idempotent: true,
  params: [
    calendarUid,
    eventUid,
    etag,
    {
      key: "recurrenceId",
      label: "Recurrence ID",
      type: "string",
      hint: "Delete one instance of a recurring event rather than the whole series. ICS format " +
        "(yyyyMMdd'T'HHmmss'Z', or yyyyMMdd for an all-day parent event).",
    },
    {
      key: "recurrenceEditType",
      label: "Recurrence edit type",
      type: "select",
      options: [
        { value: "only", label: "Only this occurrence (default when Recurrence ID is set)" },
        { value: "following", label: "This and future occurrences" },
      ],
    },
    {
      key: "notifyAttendee",
      label: "Notify attendees",
      type: "number",
      validation: { enum: [0, 1, 2] },
      hint: "0=none, 1=attendees only, 2=attendees and myself.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Event UID" },
    { key: "estatus", type: "string", label: "Result" },
  ],

  execute(input, ctx) {
    return deleteEvent(ctx, input.calendarUid, input.eventUid, input);
  },
};

export default eventDelete;
