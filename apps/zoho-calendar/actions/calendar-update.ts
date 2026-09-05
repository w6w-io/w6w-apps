import type { ActionDefinition } from "@w6w/types";
import { calendarDataParams, calendarUid } from "../lib/params.ts";
import { type CalendarDataInput, updateCalendar } from "../lib/calendars.ts";

interface Input extends CalendarDataInput {
  calendarUid: string;
}

/** `PUT /calendars/<uid>` — a genuine partial patch: send only the fields that changed. */
const calendarUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "calendar-update",
  type: "perform",
  resource: "calendar",
  title: "Update Calendar",
  description: "Update an existing calendar. Provide at least one field.",
  idempotent: true,
  params: [calendarUid, ...calendarDataParams],
  output: [{ key: "uid", type: "string", label: "Calendar UID" }],

  execute(input, ctx) {
    return updateCalendar(ctx, input.calendarUid, input);
  },
};

export default calendarUpdate;
