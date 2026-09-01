import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { disputeIdParam } from "../lib/params.ts";

/**
 * `POST /v1/disputes/{id}/accept` — accept a dispute, acknowledging it as
 * lost.
 *
 * This is **irreversible**: status moves to `lost` and the disputed amount
 * is deducted from the account balance. Only use this when there is no
 * intent to contest.
 */
interface Input {
  id: string;
}

const disputeAccept: ActionDefinition<Input> = {
  key: "dispute-accept",
  type: "perform",
  resource: "dispute",
  title: "Accept Dispute",
  description:
    "Accept a dispute as lost. Irreversible — the disputed amount is deducted from your balance.",
  idempotent: true,
  params: [disputeIdParam()],
  output: [
    { key: "id", type: "string", label: "Dispute ID" },
    { key: "status", type: "string", label: "Now 'lost' on success" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(`/disputes/${encodeURIComponent(input.id)}/accept`);
  },
};

export default disputeAccept;
