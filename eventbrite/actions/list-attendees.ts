import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  scope: "event" | "organization";
  scopeId: string;
  status?: "attending" | "not_attending" | "unpaid";
  changedSince?: string;
  pageSize?: number;
  continuation?: string;
}

const listAttendees: ActionDefinition<Input> = {
  key: "list-attendees",
  type: "read",
  resource: "attendee",
  title: "List Attendees",
  description: "List attendees for an event or organization.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      default: "event",
      options: [
        { value: "event", label: "Event" },
        { value: "organization", label: "Organization" },
      ],
    },
    { key: "scopeId", label: "Scope ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "attending", label: "Attending" },
        { value: "not_attending", label: "Not attending" },
        { value: "unpaid", label: "Unpaid" },
      ],
    },
    { key: "changedSince", label: "Changed since (ISO datetime)", type: "string" },
    { key: "pageSize", label: "Page size", type: "number", default: 50 },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "attendees", type: "array", label: "Attendees" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const path = input.scope === "organization"
      ? `/organizations/${input.scopeId}/attendees/`
      : `/events/${input.scopeId}/attendees/`;
    return client.request<EventbriteListResponse<"attendees">>(path, {
      query: {
        status: input.status,
        changed_since: input.changedSince,
        page_size: input.pageSize ?? 50,
        continuation: input.continuation,
      },
    });
  },
};

export default listAttendees;
