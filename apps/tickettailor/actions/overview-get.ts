import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/overview` — verified against `getOverview`, 2026-09-05. This is the same endpoint `auth/api-key.ts` uses to check credential liveness. */
const overviewGet: ActionDefinition<Record<string, never>> = {
  key: "overview-get",
  type: "read",
  resource: "overview",
  title: "Get Box Office Overview",
  description:
    "Box office statistics: revenue, orders received, tickets issued, and event/series counts.",
  params: [],
  output: [
    { key: "box_office_name", type: "string", label: "Box office name" },
    { key: "currency", type: "object", label: "Revenue currency" },
    { key: "revenue", type: "number", label: "Revenue" },
    { key: "orders_received", type: "number", label: "Orders received in the reporting period" },
    { key: "total_issued_tickets", type: "number", label: "Total issued tickets" },
    { key: "event_series_published", type: "number", label: "Published event series" },
    { key: "event_series_draft", type: "number", label: "Draft event series" },
    { key: "event_occurrences_published", type: "number", label: "Published event occurrences" },
    { key: "event_occurrences_draft", type: "number", label: "Draft event occurrences" },
    { key: "period", type: "string", label: "Reporting period label" },
  ],

  execute(_input, ctx) {
    return new TicketTailorClient(ctx).request("/overview");
  },
};

export default overviewGet;
