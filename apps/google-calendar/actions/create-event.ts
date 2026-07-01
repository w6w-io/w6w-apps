import type { ActionDefinition } from "@w6w/types";
import { encodeCalendarId, GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  summary?: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
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
  conferenceSolution?: "eventHangout" | "eventNamedHangout" | "hangoutsMeet";
}

interface EventPayload {
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
  colorId?: string;
  visibility?: string;
  transparency?: string;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  recurrence?: string[];
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolution: { type: string };
    };
  };
}

/**
 * `events.insert` — https://developers.google.com/calendar/v3/reference/events/insert
 *
 * n8n's original action bundled a lot of "help me build the payload" affordances
 * (recurrence builder UI, moment.tz normalisation, reminders UI). We keep the
 * shape of the body identical to what Google expects and let the caller pass
 * RFC 3339 timestamps directly — no timezone normalisation.
 */
const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description:
    "Insert an event on a calendar. `start` and `end` must be RFC 3339 timestamps (or dates when `allDay`).",
  idempotent: false,
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    { key: "summary", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "location", label: "Location", type: "string" },
    { key: "start", label: "Start (RFC 3339)", type: "datetime", required: true },
    { key: "end", label: "End (RFC 3339)", type: "datetime", required: true },
    { key: "timeZone", label: "Time zone (IANA)", type: "string" },
    { key: "allDay", label: "All-day event", type: "boolean", default: false },
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
    {
      key: "recurrence",
      label: "Recurrence (RRULE lines)",
      type: "string",
      repeat: true,
      hint: "e.g. `RRULE:FREQ=WEEKLY;COUNT=10`.",
    },
    { key: "useDefaultReminders", label: "Use default reminders", type: "boolean", default: true },
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
    {
      key: "conferenceSolution",
      label: "Conference solution",
      type: "select",
      options: [
        { value: "eventHangout", label: "Google Hangout" },
        { value: "eventNamedHangout", label: "Google Hangout Classic" },
        { value: "hangoutsMeet", label: "Google Meet" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    const body: EventPayload = input.allDay
      ? {
        start: { date: input.start },
        end: { date: input.end },
      }
      : {
        start: { dateTime: input.start, timeZone: input.timeZone },
        end: { dateTime: input.end, timeZone: input.timeZone },
      };

    if (input.summary !== undefined) body.summary = input.summary;
    if (input.description !== undefined) body.description = input.description;
    if (input.location !== undefined) body.location = input.location;
    if (input.attendees?.length) {
      body.attendees = input.attendees.map((email) => ({ email }));
    }
    if (input.colorId) body.colorId = input.colorId;
    if (input.visibility) body.visibility = input.visibility;
    if (input.transparency) body.transparency = input.transparency;
    if (input.guestsCanInviteOthers !== undefined) {
      body.guestsCanInviteOthers = input.guestsCanInviteOthers;
    }
    if (input.guestsCanModify !== undefined) body.guestsCanModify = input.guestsCanModify;
    if (input.guestsCanSeeOtherGuests !== undefined) {
      body.guestsCanSeeOtherGuests = input.guestsCanSeeOtherGuests;
    }
    if (input.recurrence?.length) body.recurrence = input.recurrence;
    if (input.useDefaultReminders === false) {
      body.reminders = { useDefault: false, overrides: input.reminders };
    }

    const query: Record<string, string | number | boolean | undefined> = {
      sendUpdates: input.sendUpdates,
      maxAttendees: input.maxAttendees,
    };
    if (input.conferenceSolution) {
      body.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolution: { type: input.conferenceSolution },
        },
      };
      query.conferenceDataVersion = 1;
    }

    return client.request(`/calendars/${encodeCalendarId(input.calendarId)}/events`, {
      method: "POST",
      body,
      query,
    });
  },
};

export default createEvent;
