import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  host?: string;
  before?: string;
  after?: string;
  limit?: number;
}

/** GET /booking-calendars — cursor-paginated. */
const bookingCalendarList: ActionDefinition<Input> = {
  key: "booking-calendar-list",
  type: "read",
  resource: "booking-calendar",
  title: "List Booking Calendars",
  description: "List all booking calendars in the account (GET /booking-calendars).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "Booking calendars" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    { key: "host", label: "Host user or team ID", type: "string" },
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/booking-calendars", {
      query: { host: input.host, before: input.before, after: input.after, limit: input.limit },
    });
  },
};

export default bookingCalendarList;
