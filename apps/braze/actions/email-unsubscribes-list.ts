import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /email/unsubscribes` — verified against the fetched spec. `limit`/`offset` paged. */
const action: ActionDefinition = {
  key: "email-unsubscribes-list",
  type: "read",
  resource: "email",
  title: "List Unsubscribed Emails",
  description: "Query email addresses that have unsubscribed, optionally in a date range.",
  params: [
    { key: "startDate", label: "Start Date", type: "date" },
    { key: "endDate", label: "End Date", type: "date" },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 500." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "sortDirection",
      label: "Sort Direction",
      type: "select",
      options: [
        { value: "desc", label: "Newest first" },
        { value: "asc", label: "Oldest first" },
      ],
    },
    { key: "email", label: "Email", type: "string", hint: "Filter to a single address." },
  ],
  output: [
    { key: "emails", type: "array", label: "Emails" },
  ],

  async execute(input, ctx) {
    const p = input as {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      sortDirection?: string;
      email?: string;
    };
    return await new BrazeClient(ctx).get("/email/unsubscribes", {
      start_date: p.startDate || undefined,
      end_date: p.endDate || undefined,
      limit: p.limit,
      offset: p.offset,
      sort_direction: p.sortDirection || undefined,
      email: p.email || undefined,
    });
  },
};

export default action;
