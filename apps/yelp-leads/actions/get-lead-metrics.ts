import type { ActionDefinition } from "@w6w/types";
import { encodeLeadId, yelpRequest } from "../lib/client.ts";

interface Input {
  leadId: string;
}

/**
 * `GET /v3/leads/{ID}/metrics` — currently a single metric, `cost_per_lead`
 * (`{value, currency_code}`, value in cents), per the OpenAPI
 * `GetMetricsResponse`/`LeadCost` schemas and the vendor's own sample
 * response `{"metrics": {"cost_per_lead": {"value": 0, "currency_code": "USD"}}}`.
 */
const getLeadMetrics: ActionDefinition<Input> = {
  key: "get-lead-metrics",
  type: "read",
  resource: "lead",
  title: "Get Lead Metrics",
  description: "Read a lead's cost metrics (currently: cost per lead).",
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
  ],
  output: [
    { key: "metrics", type: "object", label: "Lead metrics" },
  ],

  execute(input, ctx) {
    return yelpRequest(ctx, `/leads/${encodeLeadId(input.leadId)}/metrics`);
  },
};

export default getLeadMetrics;
