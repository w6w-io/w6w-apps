import type { ActionDefinition } from "@w6w/types";
import { compact, WatiClient } from "../lib/client.ts";

interface Input {
  dateFrom?: string;
  dateTo?: string;
}

interface GetContactCountResponse {
  contact_count: number;
}

/**
 * `GET /api/ext/v3/contacts/count` — verified against the embedded OpenAPI document 2026-09-05.
 * `date_from`/`date_to` are documented as plain strings with no stated format; Wati's own
 * example uses none, so both params are passed through verbatim rather than assuming ISO 8601.
 */
const action: ActionDefinition<Input, GetContactCountResponse> = {
  key: "contacts-count-get",
  type: "read",
  resource: "contacts",
  title: "Get Contact Count",
  description: "Count contacts, optionally filtered to a date range.",
  params: [
    {
      key: "dateFrom",
      label: "From Date",
      type: "string",
      hint: "Wati's docs give no format for this filter — pass the value your Wati account " +
        "expects.",
    },
    {
      key: "dateTo",
      label: "To Date",
      type: "string",
      hint: "Same caveat as From Date.",
    },
  ],
  output: [{ key: "contact_count", label: "Contact Count", type: "number" }],

  async execute(input, ctx) {
    ctx.log("info", "counting Wati contacts");
    return await new WatiClient(ctx).get<GetContactCountResponse>(
      "/contacts/count",
      compact({ date_from: input.dateFrom, date_to: input.dateTo }),
    );
  },
};

export default action;
