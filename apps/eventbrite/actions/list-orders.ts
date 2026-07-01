import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  scope: "event" | "organization";
  scopeId: string;
  status?: string;
  changedSince?: string;
  onlyEmails?: string;
  excludeEmails?: string;
  expand?: string;
  pageSize?: number;
  continuation?: string;
}

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

const listOrders: ActionDefinition<Input> = {
  key: "list-orders",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders for an event or organization.",
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
    {
      key: "scopeId",
      label: "Scope ID",
      type: "string",
      required: true,
      hint: "Event ID when scope is `event`, organization ID when scope is `organization`.",
    },
    { key: "status", label: "Status", type: "string", hint: "e.g. `placed`, `refunded`, `transferred`." },
    { key: "changedSince", label: "Changed since (ISO datetime)", type: "string" },
    { key: "onlyEmails", label: "Only emails (comma-separated)", type: "string" },
    { key: "excludeEmails", label: "Exclude emails (comma-separated)", type: "string" },
    { key: "expand", label: "Expand", type: "string", default: DEFAULT_EXPAND },
    { key: "pageSize", label: "Page size", type: "number", default: 50 },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const path = input.scope === "organization"
      ? `/organizations/${input.scopeId}/orders/`
      : `/events/${input.scopeId}/orders/`;
    return client.request<EventbriteListResponse<"orders">>(path, {
      query: {
        status: input.status,
        changed_since: input.changedSince,
        only_emails: input.onlyEmails,
        exclude_emails: input.excludeEmails,
        expand: input.expand ?? DEFAULT_EXPAND,
        page_size: input.pageSize ?? 50,
        continuation: input.continuation,
      },
    });
  },
};

export default listOrders;
