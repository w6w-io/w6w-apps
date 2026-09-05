import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/**
 * `GET /v1/api/leads/{leadId}` — full lead detail: contact info, pipeline
 * position, opportunities, quotes and totals.
 *
 * `premium`/`quoted`/`totalOpportunityPremium`/`totalQuotePremium`/
 * `totalPolicyPremium` are all in **cents** — see `lib/client.ts`.
 */
interface Input {
  leadId: number;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch a lead's full detail, including opportunities and quotes.",
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status (0-5, see List Leads)" },
    { key: "premium", type: "number", label: "Sold premium, in cents" },
    { key: "quoted", type: "number", label: "Quoted premium, in cents" },
    { key: "opportunities", type: "array", label: "Opportunities" },
    { key: "quotes", type: "array", label: "Quotes" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).get(`/leads/${input.leadId}`);
  },
};

export default leadGet;
