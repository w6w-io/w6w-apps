import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { settlementIdParam } from "../lib/params.ts";

/** `GET /v1/settlements/{id}` — a specific settlement's details. */
interface Input {
  id: string;
}

const settlementGet: ActionDefinition<Input> = {
  key: "settlement-get",
  type: "read",
  resource: "settlement",
  title: "Get Settlement",
  description: "Fetch details of a specific settlement transaction.",
  params: [settlementIdParam()],
  output: [
    { key: "id", type: "string", label: "Settlement ID" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    { key: "status", type: "string", label: "created | processed | failed" },
    { key: "fees", type: "number", label: "Processing fees (sub-unit)" },
    { key: "tax", type: "number", label: "Tax on fees (sub-unit)" },
    { key: "utr", type: "string", label: "Bank UTR reference" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/settlements/${encodeURIComponent(input.id)}`);
  },
};

export default settlementGet;
