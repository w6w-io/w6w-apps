import type { ActionDefinition } from "@w6w/types";
import { encodeCalendarId, GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  eventId: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  allDay?: boolean;
  attendees?: string[];
  colorId?: string;
  visibility?: "default" | "public" | "private" | "confidential";
  transparency?: "opaque" | "transparent";
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  recurrence?: string[];
  useDefaultReminders?: boolean;
  reminders?: Array<{ method: "email" | "popup"; minutes: number }>;
  sendUpdates?: "all" | "externalOnly" | "none";
  maxAttendees?: number;
}

interface EventPatch {
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
  colorId?: string;
  visibility?: string;
  transparency?: string;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  recurrence?: string[];
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> };
}

/**
 * `events.patch` — partial update.
 * https://developers.google.com/calendar/v3/reference/events/patch
 */
const updateEvent: ActionDefinition<Input> = {
  key: "update-event",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description:
    "Patch fields on an existing event. Only supplied fields are sent; omit a field to leave it untouched.",
  idempotent: false,
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "summary", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "location", label: "Location", type: "string" },
    { key: "start", label: "Start (RFC 3339)", type: "datetime" },
    { key: "end", label: "End (RFC 3339)", type: "datetime" },
    { key: "timeZone", label: "Time zone (IANA)", type: "string" },
    { key: "allDay", label: "All-day event", type: "boolean" },
    { key: "attendees", label: "Attendee emails", type: "string", repeat: true },
    { key: "colorId", label: "Color ID", type: "string" },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "default", label: "Default" },
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
        { value: "confidential", label: "Confidential" },
      ],
    },
    {
      key: "transparency",
      label: "Show me as",
      type: "select",
      options: [
        { value: "opaque", label: "Busy" },
        { value: "transparent", label: "Available" },
      ],
    },
    { key: "guestsCanInviteOthers", label: "Guests can invite others", type: "boolean" },
    { key: "guestsCanModify", label: "Guests can modify", type: "boolean" },
    { key: "guestsCanSeeOtherGuests", label: "Guests can see other guests", type: "boolean" },
    { key: "recurrence", label: "Recurrence (RRULE lines)", type: "string", repeat: true },
    { key: "useDefaultReminders", label: "Use default reminders", type: "boolean" },
    { key: "maxAttendees", label: "Max attendees", type: "number" },
    {
      key: "sendUpdates",
      label: "Send updates",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "externalOnly", label: "External only" },
        { value: "none", label: "None" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    const body: EventPatch = {};

    if (input.start !== undefined) {
      body.start = input.allDay
        ? { date: input.start }
        : { dateTime: input.start, timeZone: input.timeZone };
    }
    if (input.end !== undefined) {
      body.end = input.allDay
        ? { date: input.end }
        : { dateTime: input.end, timeZone: input.timeZone };
    }
    if (input.summary !== undefined) body.summary = input.summary;
    if (input.description !== undefined) body.description = input.description;
    if (input.location !== undefined) body.location = input.location;
    if (input.attendees) body.attendees = input.attendees.map((email) => ({ email }));
    if (input.colorId !== undefined) body.colorId = input.colorId;
    if (input.visibility !== undefined) body.visibility = input.visibility;
    if (input.transparency !== undefined) body.transparency = input.transparency;
    if (input.guestsCanInviteOthers !== undefined) {
      body.guestsCanInviteOthers = input.guestsCanInviteOthers;
    }
    if (input.guestsCanModify !== undefined) body.guestsCanModify = input.guestsCanModify;
    if (input.guestsCanSeeOtherGuests !== undefined) {
      body.guestsCanSeeOtherGuests = input.guestsCanSeeOtherGuests;
    }
    if (input.recurrence !== undefined) body.recurrence = input.recurrence;
    if (input.useDefaultReminders === false) {
      body.reminders = { useDefault: false, overrides: input.reminders };
    } else if (input.useDefaultReminders === true) {
      body.reminders = { useDefault: true };
    }

    return client.request(
      `/calendars/${encodeCalendarId(input.calendarId)}/events/${input.eventId}`,
      {
        method: "PATCH",
        body,
        query: {
          sendUpdates: input.sendUpdates,
          maxAttendees: input.maxAttendees,
        },
      },
    );
  },
};

export default updateEvent;
