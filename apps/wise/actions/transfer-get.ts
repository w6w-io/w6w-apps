import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/** `GET /transfers/{transferId}` — a single transfer's current status and details. */
interface Input {
  transferId: number;
}

const transferGet: ActionDefinition<Input> = {
  key: "transfer-get",
  type: "read",
  resource: "transfer",
  title: "Get Transfer",
  description: "Get a single transfer's current status and details.",
  params: [
    { key: "transferId", label: "Transfer ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Transfer ID" },
    { key: "status", type: "string", label: "Transfer status" },
    { key: "targetAccount", type: "number", label: "Recipient account ID" },
    { key: "rate", type: "number", label: "Exchange rate" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(`/transfers/${input.transferId}`);
  },
};

export default transferGet;
