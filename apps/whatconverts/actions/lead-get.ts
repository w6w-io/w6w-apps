import type { ActionDefinition } from "@w6w/types";
import { boolParam, WhatConvertsClient } from "../lib/client.ts";
import { LEAD_OUTPUT_FIELDS } from "../lib/lead-fields.ts";

interface Input {
  leadId: number;
  customerJourney?: boolean;
}

/**
 * `GET /leads/{lead_id}` — details for a single lead (call, form, chat, email,
 * transaction, event, appointment or text message).
 *
 * Verified against `whatconverts.com/api/leads/` on 2026-08-29. `customer_journey: true`
 * (Elite plans) includes the attribution + page-view trail leading to this lead.
 */
const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Get details about a single lead.",
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    {
      key: "customerJourney",
      label: "Include customer journey",
      type: "boolean",
      hint: "Elite plans only. Default false.",
    },
  ],
  output: LEAD_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(`/leads/${input.leadId}`, {
      customer_journey: boolParam(input.customerJourney),
    });
  },
};

export default leadGet;
