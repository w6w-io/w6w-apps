import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V1 } from "../lib/client.ts";
import { reminderMinuteOptions } from "../lib/params.ts";

/**
 * `POST /rest/v1/appointments` — Create an Appointment. **v1, and deliberately so.**
 *
 * v2 has no appointment endpoints — see `actions/appointment-list.ts` for the
 * count and the reasoning.
 *
 * ## Required: title, start and end. Not the contact
 *
 * `Appointment.required` is `["end_date", "start_date", "title"]`. An
 * appointment with no contact is legal — it is a calendar block. But the two
 * optional properties carry a condition worth reading twice: `user` is
 * "Required only for pop-up reminders" and `contact_id` is "Required for
 * pop-up reminders". So setting a reminder without both makes the reminder
 * quietly not happen, and this action refuses that combination instead.
 *
 * ## `remind_time` is a closed set the schema mistypes
 *
 * Declared `type: integer` with a **string** enum
 * (`["5","10",…,"2880"]`) — the same defect as the v2 task field. Numbers are
 * sent, per the declared type and the `example: 30`.
 *
 * ## The property is `user`, not `user_id`
 *
 * The assignee's field on this v1 schema is bare `user`, holding an int64 id.
 * Every v2 equivalent in this app is `user_id` or `assigned_to_user_id`.
 */
interface Input {
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  location?: string;
  contactId?: string;
  userId?: string;
  remindTime?: number;
}

const appointmentCreate: ActionDefinition<Input> = {
  key: "appointment-create",
  type: "perform",
  title: "Create Appointment",
  resource: "appointment",
  description: "Create a calendar appointment, optionally attached to a contact with a pop-up " +
    "reminder. Uses Keap's v1 API — v2 has no appointment endpoints.",
  // Keap performs no duplicate detection on appointments and returns a fresh
  // id per call, so a retry double-books the calendar.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "startDate",
      label: "Starts at",
      type: "datetime",
      required: true,
      row: "when",
      hint: "ISO-8601, e.g. 2026-01-15T09:00:00.000Z.",
    },
    { key: "endDate", label: "Ends at", type: "datetime", required: true, row: "when" },
    { key: "description", label: "Description", type: "text" },
    { key: "location", label: "Location", type: "string" },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Optional for the appointment itself, but required if you set a reminder.",
    },
    {
      key: "userId",
      label: "Assigned user ID",
      type: "string",
      hint: "Optional for the appointment itself, but required if you set a reminder.",
    },
    {
      key: "remindTime",
      label: "Pop-up reminder",
      type: "select",
      options: reminderMinuteOptions,
      hint: "Needs both a contact and a user; Keap accepts only these intervals.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Appointment ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "start_date", type: "string", label: "Starts at" },
    { key: "end_date", type: "string", label: "Ends at" },
  ],

  execute(input, ctx) {
    if (input.remindTime !== undefined && (!input.contactId || !input.userId)) {
      throw new Error(
        "A pop-up reminder needs both a contact ID and an assigned user ID — Keap documents both " +
          "as required for reminders, and silently skips the reminder without them.",
      );
    }

    const body = compact({
      title: input.title,
      start_date: input.startDate,
      end_date: input.endDate,
      description: input.description,
      location: input.location,
      contact_id: input.contactId === undefined ? undefined : Number(input.contactId),
      // Bare `user`, not `user_id` — this is the v1 schema.
      user: input.userId === undefined ? undefined : Number(input.userId),
      remind_time: input.remindTime === undefined ? undefined : Number(input.remindTime),
    });

    const client = new KeapClient(ctx);
    return client.json(`${V1}/appointments`, { method: "POST", body });
  },
};

export default appointmentCreate;
