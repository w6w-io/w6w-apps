import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Fetch a single transaction by id.",
  params: [idParam("Transaction")],
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "status", type: "string", label: "Status" },
    { key: "method", type: "string", label: "Payment method" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/transactions/${encodeURIComponent(input.id)}`);
  },
};

export default transactionGet;
