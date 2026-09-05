import type { ActionDefinition } from "@w6w/types";
import { calendarDataParams } from "../lib/params.ts";
import { type CalendarDataInput, createCalendar } from "../lib/calendars.ts";

interface Input extends CalendarDataInput {
  name: string;
  color: string;
}

/** `POST /calendars` — `name` and `color` are the only two fields Zoho documents as mandatory. */
const calendarCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "calendar-create",
  type: "perform",
  resource: "calendar",
  title: "Create Calendar",
  description: "Create a new personal calendar. `name` and `color` are required.",
  idempotent: false,
  params: [
    { ...calendarDataParams[0], required: true },
    { ...calendarDataParams[1], required: true },
    ...calendarDataParams.slice(2),
  ],
  output: [{ key: "uid", type: "string", label: "Calendar UID" }],

  execute(input, ctx) {
    return createCalendar(ctx, input);
  },
};

export default calendarCreate;
