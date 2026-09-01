import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { refundIdParam } from "../lib/params.ts";

/** `GET /v1/refunds/{id}` — a refund's full details and current status. */
interface Input {
  id: string;
}

const refundGet: ActionDefinition<Input> = {
  key: "refund-get",
  type: "read",
  resource: "refund",
  title: "Get Refund",
  description: "Fetch a refund's full details and current status.",
  params: [refundIdParam()],
  output: [
    { key: "id", type: "string", label: "Refund ID" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    { key: "payment_id", type: "string", label: "Original payment ID" },
    { key: "status", type: "string", label: "pending | processed | failed" },
    { key: "speed_requested", type: "string", label: "normal | optimum" },
    { key: "speed_processed", type: "string", label: "Actual processing mode used" },
    { key: "acquirer_data", type: "object", label: "Bank reference numbers (RRN/ARN/UTR)" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/refunds/${encodeURIComponent(input.id)}`);
  },
};

export default refundGet;
