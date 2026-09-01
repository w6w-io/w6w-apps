import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";

/**
 * `POST /v2/lead_conversions` — convert a lead into a contact and/or a deal.
 *
 * Which contact type(s) get created is driven by which fields the LEAD
 * already has, not by anything passed here: "If a lead has specified
 * `last_name`, an individual is created... If a lead has specified
 * `organization_name`, an organization is created... If both fields are
 * specified, [it] will be converted to an individual and an organization."
 *
 * Not marked `idempotent`: converting the same lead twice is not a no-op — the
 * vendor does not guard against it, so a retried call creates a second set of
 * contacts/deal.
 */
interface Input {
  leadId: number;
  ownerId?: number;
  createDeal?: boolean;
}

const leadConvert: ActionDefinition<Input> = {
  key: "lead-convert",
  type: "perform",
  resource: "lead",
  title: "Convert Lead",
  description:
    "Convert a lead into a contact (individual and/or organization) and, by default, a deal.",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    {
      key: "ownerId",
      label: "Owner user ID for created records",
      type: "number",
      hint: "Defaults to the lead's own owner.",
    },
    {
      key: "createDeal",
      label: "Also create a deal",
      type: "boolean",
      default: true,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Lead conversion ID" },
    { key: "leadId", type: "number", label: "Converted lead ID" },
    { key: "individualId", type: "number", label: "Created individual contact ID, if any" },
    { key: "organizationId", type: "number", label: "Created organization contact ID, if any" },
    { key: "dealId", type: "number", label: "Created deal ID, if any" },
  ],

  async execute(input, ctx) {
    const data = compact({
      lead_id: input.leadId,
      owner_id: input.ownerId,
      create_deal: input.createDeal,
    });
    const result = await new SellClient(ctx).create<{
      id: number;
      lead_id: number;
      individual_id: number | null;
      organization_id: number | null;
      deal_id: number | null;
    }>("/lead_conversions", data);
    return {
      id: result.id,
      leadId: result.lead_id,
      individualId: result.individual_id,
      organizationId: result.organization_id,
      dealId: result.deal_id,
    };
  },
};

export default leadConvert;
