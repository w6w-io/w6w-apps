import type { ActionDefinition } from "@w6w/types";
import { compact, LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";
import { EVENT_ASSOCIATION_TYPES } from "../lib/params.ts";

interface Input {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  eventableType?: string;
  eventableId?: string;
  userIds?: string;
  allDay?: boolean;
  timeZone?: string;
  reminderType?: string;
  reminderDelayLength?: number;
  sendInvites?: boolean;
}

/**
 * `POST /v1/events` — create an Event/Appointment. Confirmed against the
 * collection's "Create Event" sample body and its "Optional Fields" doc:
 * `reminder_type` is one of `minutes`/`hours`/`days`/`weeks`/`months`,
 * `time_zone` a tz-database identifier (e.g. `America/Los_Angeles`),
 * `send_invites` defaults `true`, `all_day` defaults `false`.
 */
const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description:
    "Create a new Event/Appointment, optionally attached to a Matter, Contact or Client.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "startDate",
      label: "Start Date",
      type: "datetime",
      required: true,
      hint: "ISO 8601 datetime, e.g. 2026-09-30T15:00:00-07:00.",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "datetime",
      required: true,
      hint: "ISO 8601 datetime, e.g. 2026-09-30T15:30:00-07:00.",
    },
    {
      key: "eventableType",
      label: "Associated Record Type",
      type: "select",
      options: EVENT_ASSOCIATION_TYPES,
    },
    {
      key: "eventableId",
      label: "Associated Record ID",
      type: "string",
      dependsOn: ["eventableType"],
    },
    {
      key: "userIds",
      label: "Host User IDs",
      type: "string",
      hint: "Comma-separated Lawmatics User IDs hosting this appointment.",
    },
    { key: "allDay", label: "All Day", type: "boolean", default: false, advanced: true },
    {
      key: "timeZone",
      label: "Time Zone",
      type: "string",
      hint: "IANA tz identifier, e.g. America/Los_Angeles. Defaults to the firm's own timezone.",
      advanced: true,
    },
    {
      key: "reminderType",
      label: "Reminder Unit",
      type: "select",
      options: [
        { value: "minutes", label: "Minutes" },
        { value: "hours", label: "Hours" },
        { value: "days", label: "Days" },
        { value: "weeks", label: "Weeks" },
        { value: "months", label: "Months" },
      ],
      advanced: true,
    },
    {
      key: "reminderDelayLength",
      label: "Reminder Delay",
      type: "number",
      hint: "Combined with Reminder Unit — how long before the appointment to send a reminder.",
      dependsOn: ["reminderType"],
      advanced: true,
    },
    { key: "sendInvites", label: "Send Invites", type: "boolean", default: true, advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Event attributes" },
  ],

  async execute(input, ctx) {
    const userIds = input.userIds
      ? input.userIds.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>("/events", {
      method: "POST",
      body: compact({
        name: input.name,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
        eventable_type: input.eventableType,
        eventable_id: input.eventableId,
        user_ids: userIds,
        all_day: input.allDay,
        time_zone: input.timeZone,
        reminder_type: input.reminderType,
        reminder_delay_length: input.reminderDelayLength,
        send_invites: input.sendInvites,
      }),
    });
    return res.data;
  },
};

export default createEvent;
