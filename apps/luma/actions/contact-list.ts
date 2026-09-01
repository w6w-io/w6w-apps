import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { paginationParams, sortDirectionParam } from "../lib/params.ts";

interface Input {
  query?: string;
  tags?: string[];
  calendarMembershipTierId?: string;
  membershipStatus?: "approved" | "pending" | "approved-pending-payment" | "declined";
  paginationCursor?: string;
  paginationLimit?: number;
  sortColumn?: string;
  sortDirection?: string;
}

/** `GET /v1/calendars/contacts/list` — the connected calendar's contact/CRM list. */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts on the connected calendar, with search, tag and membership filters.",
  params: [
    { key: "query", label: "Search", type: "string", hint: "Searches over names and emails." },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      options: [],
      hint: "Tag names or tag IDs. Returns contacts matching any of the given tags.",
    },
    {
      key: "calendarMembershipTierId",
      label: "Membership tier",
      type: "string",
      advanced: true,
    },
    {
      key: "membershipStatus",
      label: "Membership status",
      type: "select",
      advanced: true,
      options: [
        { value: "approved", label: "Approved" },
        { value: "pending", label: "Pending" },
        { value: "approved-pending-payment", label: "Approved, pending payment" },
        { value: "declined", label: "Declined" },
      ],
      hint: "Only relevant for Calendar Memberships.",
    },
    ...paginationParams(),
    {
      key: "sortColumn",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "created_at", label: "Created at" },
        { value: "event_checked_in_count", label: "Events checked in" },
        { value: "event_approved_count", label: "Events approved" },
        { value: "name", label: "Name" },
        { value: "revenue_usd_cents", label: "Revenue" },
      ],
    },
    { ...sortDirectionParam, advanced: true },
  ],
  output: [
    { key: "entries", type: "array", label: "Contacts" },
    { key: "has_more", type: "boolean", label: "Has more" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).list("/v1/calendars/contacts/list", {
      query: compact({
        query: input.query,
        tags: input.tags,
        calendar_membership_tier_id: input.calendarMembershipTierId,
        membership_status: input.membershipStatus,
        pagination_cursor: input.paginationCursor,
        pagination_limit: input.paginationLimit,
        sort_column: input.sortColumn,
        sort_direction: input.sortDirection,
      }),
    });
  },
};

export default contactList;
