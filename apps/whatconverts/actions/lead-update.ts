import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, WhatConvertsClient } from "../lib/client.ts";
import { LEAD_OUTPUT_FIELDS } from "../lib/lead-fields.ts";

interface Input {
  leadId: number;
  quotable?: "yes" | "no" | "pending" | "not_set";
  quoteValue?: number;
  salesValue?: number;
  leadUrl?: string;
  additionalFields?: unknown;
  customFields?: unknown;
}

/**
 * `POST /leads/{lead_id}` — edit a lead. Verified against `whatconverts.com/api/leads/` on
 * 2026-08-29 — the vendor documents a deliberately narrow field set for edit (qualification
 * and value fields, plus custom data), distinct from the much larger create parameter list.
 *
 * Setting the same values twice leaves the lead in the same state, so this action is
 * idempotent in the sense that drives safe retry — unlike create, it never produces a
 * second row.
 */
const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Edit qualification and value fields for a single lead.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    {
      key: "quotable",
      label: "Quotable",
      type: "select",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "pending", label: "Pending" },
        { value: "not_set", label: "Not set" },
      ],
    },
    { key: "quoteValue", label: "Quote value", type: "number" },
    { key: "salesValue", label: "Sales value", type: "number" },
    { key: "leadUrl", label: "Lead URL", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: 'Object of field name to value, e.g. {"Company Name": "Acme"}.',
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Object of field name to value, e.g. {"Company Name": "Acme"}.',
    },
  ],
  output: LEAD_OUTPUT_FIELDS,

  async execute(input, ctx) {
    const body = compact({
      quotable: input.quotable,
      quote_value: input.quoteValue,
      sales_value: input.salesValue,
      lead_url: input.leadUrl,
      additional_fields: asOptionalJson(input.additionalFields, "additionalFields"),
      custom_fields: asOptionalJson(input.customFields, "customFields"),
    });

    return await new WhatConvertsClient(ctx).post(`/leads/${input.leadId}`, body);
  },
};

export default leadUpdate;
