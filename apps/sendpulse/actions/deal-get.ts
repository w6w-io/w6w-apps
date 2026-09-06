import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

interface Input {
  dealId: number;
}

/** `GET /crm/v1/deals/{dealId}` — full detail: pipeline, step, owner, amount, notes, fields. */
const action: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get a deal",
  description: "Get a single deal by ID.",
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Deal" },
  ],

  async execute(input, ctx) {
    return await new SendPulseClient(ctx).crm(`/deals/${input.dealId}`);
  },
};

export default action;
