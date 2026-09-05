import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /email/hard_bounces` — verified against the fetched spec. `limit`/`offset` paged. */
const action: ActionDefinition = {
  key: "email-hard-bounces-list",
  type: "read",
  resource: "email",
  title: "List Hard Bounced Emails",
  description: "Query email addresses that have hard bounced, optionally in a date range.",
  params: [
    { key: "startDate", label: "Start Date", type: "date" },
    { key: "endDate", label: "End Date", type: "date" },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 500." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
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
      email?: string;
    };
    return await new BrazeClient(ctx).get("/email/hard_bounces", {
      start_date: p.startDate || undefined,
      end_date: p.endDate || undefined,
      limit: p.limit,
      offset: p.offset,
      email: p.email || undefined,
    });
  },
};

export default action;
