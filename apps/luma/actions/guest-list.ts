import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam, paginationParams, sortDirectionParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  approvalStatus?:
    | "approved"
    | "session"
    | "pending_approval"
    | "invited"
    | "declined"
    | "waitlist";
  paginationCursor?: string;
  paginationLimit?: number;
  sortColumn?: string;
  sortDirection?: string;
}

/** `GET /v1/events/guests/list`. */
const guestList: ActionDefinition<Input> = {
  key: "guest-list",
  type: "search",
  resource: "guest",
  title: "List Guests",
  description: "List guests registered for an event.",
  params: [
    eventIdParam,
    {
      key: "approvalStatus",
      label: "Approval status",
      type: "select",
      options: [
        { value: "approved", label: "Approved (going)" },
        { value: "session", label: "Session" },
        { value: "pending_approval", label: "Pending approval" },
        { value: "invited", label: "Invited" },
        { value: "declined", label: "Declined" },
        { value: "waitlist", label: "Waitlisted" },
      ],
    },
    ...paginationParams(),
    {
      key: "sortColumn",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "name", label: "Name" },
        { value: "email", label: "Email" },
        { value: "created_at", label: "Created at" },
        { value: "registered_at", label: "Registered at" },
        { value: "checked_in_at", label: "Checked in at" },
      ],
    },
    { ...sortDirectionParam, advanced: true },
  ],
  output: [
    { key: "entries", type: "array", label: "Guests" },
    { key: "has_more", type: "boolean", label: "Has more" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).list("/v1/events/guests/list", {
      query: compact({
        event_id: input.eventId,
        approval_status: input.approvalStatus,
        pagination_cursor: input.paginationCursor,
        pagination_limit: input.paginationLimit,
        sort_column: input.sortColumn,
        sort_direction: input.sortDirection,
      }),
    });
  },
};

export default guestList;
