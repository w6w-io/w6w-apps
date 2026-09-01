import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { disputeIdParam } from "../lib/params.ts";

/** `GET /v1/disputes/{id}` — a dispute's full details, including submitted evidence. */
interface Input {
  id: string;
}

const disputeGet: ActionDefinition<Input> = {
  key: "dispute-get",
  type: "read",
  resource: "dispute",
  title: "Get Dispute",
  description: "Fetch a dispute's full details, including any submitted evidence.",
  params: [disputeIdParam()],
  output: [
    { key: "id", type: "string", label: "Dispute ID" },
    { key: "payment_id", type: "string", label: "Disputed payment" },
    { key: "amount", type: "number", label: "Disputed amount (sub-unit)" },
    { key: "reason_code", type: "string", label: "Reason code" },
    { key: "reason_description", type: "string", label: "Reason description" },
    { key: "respond_by", type: "number", label: "Response deadline (Unix timestamp)" },
    { key: "status", type: "string", label: "open | under_review | won | lost | closed" },
    {
      key: "phase",
      type: "string",
      label: "fraud | retrieval | chargeback | pre_arbitration | arbitration",
    },
    { key: "evidence", type: "object", label: "Submitted evidence" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/disputes/${encodeURIComponent(input.id)}`);
  },
};

export default disputeGet;
