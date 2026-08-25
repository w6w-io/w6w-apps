import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  status?: string;
  owner?: string;
  host?: string;
  contact?: string;
  bookingCalendar?: string;
  creationTimeGt?: string;
  creationTimeLt?: string;
  startingTimeGt?: string;
  startingTimeLt?: string;
  lastUpdatedTimeGt?: string;
  lastUpdatedTimeLt?: string;
  expand?: string;
  before?: string;
  after?: string;
  limit?: number;
}

/**
 * GET /bookings — cursor-paginated (`before`/`after`/`limit`, mutually
 * exclusive `before`/`after`). Every `*_time` filter is a separate query
 * param with a literal dot (`creation_time.gt`), which is why the API's
 * field names are mapped to camelCase here rather than reused verbatim.
 */
const bookingList: ActionDefinition<Input> = {
  key: "booking-list",
  type: "read",
  resource: "booking",
  title: "List Bookings",
  description: "List all bookings in the account (GET /bookings).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "Bookings" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    { key: "status", label: "Status", type: "string", hint: "e.g. scheduled, canceled, no_show." },
    { key: "owner", label: "Owner user ID", type: "string" },
    {
      key: "host",
      label: "Host user ID",
      type: "string",
      hint: "Bookings hosted or co-hosted by this user.",
    },
    { key: "contact", label: "Contact ID", type: "string" },
    { key: "bookingCalendar", label: "Booking calendar ID", type: "string" },
    { key: "creationTimeGt", label: "Created after", type: "string", advanced: true },
    { key: "creationTimeLt", label: "Created before", type: "string", advanced: true },
    { key: "startingTimeGt", label: "Starts after", type: "string", advanced: true },
    { key: "startingTimeLt", label: "Starts before", type: "string", advanced: true },
    { key: "lastUpdatedTimeGt", label: "Last updated after", type: "string", advanced: true },
    { key: "lastUpdatedTimeLt", label: "Last updated before", type: "string", advanced: true },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      advanced: true,
      hint: "Comma-separated: owner, contact, conversation. Prefix with data. for list expansion.",
    },
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/bookings", {
      query: {
        status: input.status,
        owner: input.owner,
        host: input.host,
        contact: input.contact,
        booking_calendar: input.bookingCalendar,
        "creation_time.gt": input.creationTimeGt,
        "creation_time.lt": input.creationTimeLt,
        "starting_time.gt": input.startingTimeGt,
        "starting_time.lt": input.startingTimeLt,
        "last_updated_time.gt": input.lastUpdatedTimeGt,
        "last_updated_time.lt": input.lastUpdatedTimeLt,
        expand: input.expand,
        before: input.before,
        after: input.after,
        limit: input.limit,
      },
    });
  },
};

export default bookingList;
