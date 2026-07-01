import type { ActionDefinition } from "@w6w/types";
import { GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  outputFormat?: "availability" | "bookedSlots" | "raw";
}

interface FreeBusyResponse {
  timeMin?: string;
  timeMax?: string;
  calendars: Record<string, {
    busy?: Array<{ start: string; end: string }>;
    errors?: Array<{ domain: string; reason: string }>;
  }>;
}

/**
 * Ports n8n's `calendar:availability` (the FreeBusy query). The n8n node
 * exposed three output shapes; we keep the same options and let the caller
 * pick, defaulting to a boolean-shaped summary (matching n8n's default).
 */
const getAvailability: ActionDefinition<Input> = {
  key: "get-availability",
  type: "read",
  resource: "calendar",
  title: "Get Availability",
  description:
    "Check whether a time slot is free or busy on a calendar via the FreeBusy API. `timeMin` and `timeMax` must be RFC 3339 timestamps.",
  params: [
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      required: true,
      hint: "Use `primary` for the authenticated user, or paste a calendar's email/ID.",
    },
    { key: "timeMin", label: "Start time (RFC 3339)", type: "datetime", required: true },
    { key: "timeMax", label: "End time (RFC 3339)", type: "datetime", required: true },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      hint: "IANA time zone (e.g. `Europe/Berlin`). Defaults to the calendar's own zone.",
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      default: "availability",
      options: [
        { value: "availability", label: "Availability (boolean)" },
        { value: "bookedSlots", label: "Booked slots (array)" },
        { value: "raw", label: "Raw FreeBusy response" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    const response = await client.request<FreeBusyResponse>("/freeBusy", {
      method: "POST",
      body: {
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        timeZone: input.timeZone,
        items: [{ id: input.calendarId }],
      },
    });

    const entry = response.calendars?.[input.calendarId];
    if (!entry) {
      throw new Error(`Google Calendar FreeBusy: no entry for ${input.calendarId}`);
    }
    if (entry.errors && entry.errors.length > 0) {
      throw new Error(
        `Google Calendar FreeBusy: ${
          entry.errors.map((e) => `${e.domain}/${e.reason}`).join(", ")
        }`,
      );
    }

    const format = input.outputFormat ?? "availability";
    if (format === "availability") return { available: !(entry.busy?.length) };
    if (format === "bookedSlots") return entry.busy ?? [];
    return response;
  },
};

export default getAvailability;
