import type { Param } from "@w6w/types";

export const calendarUid: Param = {
  key: "calendarUid",
  label: "Calendar UID",
  type: "string",
  required: true,
  hint: 'The calendar\'s `uid` (from List Calendars). Not every endpoint accepts the "default"/' +
    '"primary" alias documented for Get Calendar Details — pass a real uid unless this action ' +
    "says otherwise.",
};

export const eventUid: Param = {
  key: "eventUid",
  label: "Event UID",
  type: "string",
  required: true,
  hint: "The event's `uid` (from List Events or Get Event Details).",
};

export const etag: Param = {
  key: "etag",
  label: "ETag",
  type: "string",
  required: true,
  hint: "The event's current `etag` (from Get Event Details or the last write). Zoho rejects the " +
    "request if this is stale — re-fetch the event and retry.",
};

/** Shared optional fields for creating/updating a calendar — see `lib/calendars.ts`. */
export const calendarDataParams: Param[] = [
  { key: "name", label: "Name", type: "string", hint: "Max 50 characters." },
  {
    key: "color",
    label: "Color",
    type: "string",
    hint: "Hex code, e.g. #101010.",
    validation: { pattern: "^#[0-9A-Fa-f]{6}$" },
  },
  { key: "description", label: "Description", type: "text", hint: "Max 1000 characters." },
  { key: "textcolor", label: "Text color", type: "string", hint: "Hex code, e.g. #FFFFFF." },
  { key: "timezone", label: "Timezone", type: "string", hint: "e.g. Asia/Kolkata." },
  {
    key: "includeInFreebusy",
    label: "Count toward Free/Busy",
    type: "boolean",
    hint: "true = events in this calendar show as Busy; false = Free.",
  },
  {
    key: "private",
    label: "Private URL",
    type: "select",
    options: [
      { value: "enable", label: "Enable" },
      { value: "disable", label: "Disable" },
    ],
  },
  {
    key: "public",
    label: "Public visibility",
    type: "select",
    options: [
      { value: "disable", label: "Disabled — not accessible via a public URL" },
      { value: "freebusy", label: "Free/Busy only — public URL shows Busy, no details" },
      { value: "view", label: "Full — public URL shows all event details" },
    ],
  },
  {
    key: "reminders",
    label: "Reminders",
    type: "json",
    hint: 'JSON array, e.g. [{"action":"email","minutes":15}].',
  },
  {
    key: "status",
    label: "Show events",
    type: "boolean",
    hint: "false hides every event in this calendar.",
  },
];

export const categoryParam: Param = {
  key: "category",
  label: "Category",
  type: "select",
  options: [
    { value: "own", label: "Own" },
    { value: "group", label: "Group" },
    { value: "app", label: "App" },
    { value: "others", label: "Others" },
    { value: "all", label: "All" },
  ],
  hint: "Defaults to your own calendars when omitted.",
};

export const showHiddenCalParam: Param = {
  key: "showHiddenCal",
  label: "Show hidden calendars",
  type: "boolean",
  default: false,
};

/**
 * The `start`/`end` fields Create Event and Update Event both require — index 0/1, so callers can
 * splice in `required: true` the same way `actions/calendar-create.ts` does for name/color.
 */
export const eventRangeParams: Param[] = [
  {
    key: "start",
    label: "Start",
    type: "string",
    hint:
      "yyyyMMdd'T'HHmmss'Z' (GMT), or yyyyMMdd for an all-day event, e.g. \"20241028T103000Z\".",
  },
  {
    key: "end",
    label: "End",
    type: "string",
    hint: "Same format as Start.",
  },
];

/** Optional fields shared by Create Event and Update Event — see `lib/events.ts`. */
export const eventDataParams: Param[] = [
  { key: "title", label: "Title", type: "string" },
  { key: "timezone", label: "Timezone", type: "string", hint: "e.g. Asia/Kolkata." },
  { key: "isAllDay", label: "All-day event", type: "boolean" },
  {
    key: "isPrivate",
    label: "Private",
    type: "boolean",
    hint: "Hides event details from others even on a shared/public calendar.",
  },
  { key: "url", label: "URL", type: "string" },
  { key: "location", label: "Location", type: "string", hint: "Max 255 characters." },
  { key: "description", label: "Description", type: "text", hint: "Max 10000 characters." },
  {
    key: "richTextDescription",
    label: "Rich-text description",
    type: "text",
    hint: "HTML-formatted description. Max 12000 characters. Send either this or Description, " +
      "not both — sending both risks one overwriting the other.",
  },
  { key: "color", label: "Color", type: "string", hint: "Hex code, e.g. #E574B0." },
  {
    key: "attendees",
    label: "Attendees",
    type: "json",
    hint: 'JSON array, e.g. [{"email":"user@domain.com","permission":1}]. permission: ' +
      "0=Guest, 1=View, 2=Invite, 3=Edit.",
  },
  {
    key: "groupAttendees",
    label: "Group attendees",
    type: "json",
    hint: 'JSON array of group zuids, e.g. [{"zid":"123565"}].',
  },
  {
    key: "reminders",
    label: "Reminders",
    type: "json",
    hint: 'JSON array, e.g. [{"action":"popup","minutes":15}].',
  },
  { key: "calendarAlarm", label: "Calendar alarm", type: "boolean" },
  {
    key: "notifyAttendee",
    label: "Notify attendees",
    type: "number",
    validation: { enum: [0, 1, 2] },
    hint: "0=none, 1=attendees only, 2=attendees and myself.",
  },
  {
    key: "transparency",
    label: "Free/busy transparency",
    type: "number",
    validation: { enum: [0, 1] },
    hint: "0=add to free/busy schedule, 1=don't (shown as free).",
  },
  { key: "allowForwarding", label: "Allow forwarding", type: "boolean" },
  {
    key: "rrule",
    label: "Recurrence rule (RRULE)",
    type: "string",
    hint: 'e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;COUNT=10". Use this or Repeat, not both.',
  },
  {
    key: "repeat",
    label: "Recurrence (repeat)",
    type: "json",
    hint: 'JSON array, e.g. [{"freq":"weekly","interval":1,"byday":"MO,WE","count":10}]. Use ' +
      "this or RRULE, not both.",
  },
];
