import type { ActionDefinition } from "@w6w/types";
import { encodeCalendarId, GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
  timeZone?: string;
  q?: string;
  iCalUID?: string;
  maxAttendees?: number;
  maxResults?: number;
  orderBy?: "startTime" | "updated";
  pageToken?: string;
  showDeleted?: boolean;
  showHiddenInvitations?: boolean;
  singleEvents?: boolean;
  updatedMin?: string;
  fields?: string;
}

/**
 * `events.list` — https://developers.google.com/calendar/v3/reference/events/list
 *
 * n8n called this `get-many`; we keep the more idiomatic `list-events`. Note
 * that `orderBy=startTime` requires `singleEvents=true` per Google's docs.
 */
const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "read",
  resource: "event",
  title: "List Events",
  description:
    "List events on a calendar. Returns one page; pass `pageToken` for the next. `timeMin`/`timeMax`/`updatedMin` must be RFC 3339 timestamps.",
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    { key: "timeMin", label: "Time min (RFC 3339)", type: "datetime" },
    { key: "timeMax", label: "Time max (RFC 3339)", type: "datetime" },
    { key: "timeZone", label: "Time zone", type: "string" },
    { key: "q", label: "Search query", type: "string" },
    { key: "iCalUID", label: "iCal UID", type: "string" },
    { key: "maxAttendees", label: "Max attendees", type: "number" },
    { key: "maxResults", label: "Max results", type: "number", default: 100 },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "startTime", label: "Start time (requires singleEvents=true)" },
        { value: "updated", label: "Updated" },
      ],
    },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "showDeleted", label: "Show deleted", type: "boolean" },
    { key: "showHiddenInvitations", label: "Show hidden invitations", type: "boolean" },
    { key: "singleEvents", label: "Expand recurring events", type: "boolean", default: true },
    { key: "updatedMin", label: "Updated min (RFC 3339)", type: "datetime" },
    { key: "fields", label: "Partial response fields", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Events" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "nextSyncToken", type: "string", label: "Next sync token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    return client.request(`/calendars/${encodeCalendarId(input.calendarId)}/events`, {
      query: {
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        timeZone: input.timeZone,
        q: input.q,
        iCalUID: input.iCalUID,
        maxAttendees: input.maxAttendees,
        maxResults: input.maxResults ?? 100,
        orderBy: input.orderBy,
        pageToken: input.pageToken,
        showDeleted: input.showDeleted,
        showHiddenInvitations: input.showHiddenInvitations,
        singleEvents: input.singleEvents ?? true,
        updatedMin: input.updatedMin,
        fields: input.fields,
      },
    });
  },
};

export default listEvents;
