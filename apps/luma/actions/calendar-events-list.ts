import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { paginationParams, sortDirectionParam } from "../lib/params.ts";

interface Input {
  before?: string;
  after?: string;
  paginationCursor?: string;
  paginationLimit?: number;
  platforms?: string[];
  sortDirection?: string;
  status?: "approved" | "pending";
  access?: string[];
}

/**
 * `GET /v1/calendars/events/list`.
 *
 * `access` defaults to `manage` server-side (only events this calendar
 * manages). Including `view` also returns events listed on this calendar but
 * managed elsewhere — those come back with `access: "view"`, location
 * obfuscated to city level, and host-only fields (`meeting_url`,
 * `registration_questions`, `feedback_email`) omitted, per the vendor's own
 * parameter description.
 */
const calendarEventsList: ActionDefinition<Input> = {
  key: "calendar-events-list",
  type: "search",
  resource: "event",
  title: "List Calendar Events",
  description: "List events on the connected calendar.",
  params: [
    {
      key: "before",
      label: "Before",
      type: "datetime",
      hint: "ISO 8601 datetime. Only events starting before this.",
    },
    {
      key: "after",
      label: "After",
      type: "datetime",
      hint: "ISO 8601 datetime. Only events starting after this.",
    },
    ...paginationParams(),
    {
      key: "platforms",
      label: "Platforms",
      type: "multiselect",
      options: [
        { value: "luma", label: "Luma (default)" },
        { value: "external", label: "External" },
      ],
      hint: "Defaults to `luma` only, for backwards compatibility.",
    },
    { ...sortDirectionParam, hint: "Sorted by start time." },
    {
      key: "status",
      label: "Submission status",
      type: "select",
      options: [
        { value: "approved", label: "Approved (default)" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "access",
      label: "Access",
      type: "multiselect",
      options: [
        { value: "manage", label: "Manage (default)" },
        { value: "view", label: "View" },
      ],
      hint: "Include `view` to also see events listed on this calendar but managed elsewhere.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Events" },
    { key: "has_more", type: "boolean", label: "Has more" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).list("/v1/calendars/events/list", {
      query: compact({
        before: input.before,
        after: input.after,
        pagination_cursor: input.paginationCursor,
        pagination_limit: input.paginationLimit,
        platforms: input.platforms,
        // `sort_column` is documented with exactly one accepted value
        // (`start_at`); nothing else to choose, so it is sent only when a
        // direction is actually requested, and pinned to the vendor's sole
        // enum member.
        sort_column: input.sortDirection ? "start_at" : undefined,
        sort_direction: input.sortDirection,
        status: input.status,
        access: input.access,
      }),
    });
  },
};

export default calendarEventsList;
