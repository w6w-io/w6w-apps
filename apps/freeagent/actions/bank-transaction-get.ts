import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  bankTransactionId: string;
}

const bankTransactionGet: ActionDefinition<Input> = {
  key: "bank-transaction-get",
  type: "read",
  resource: "bank-transaction",
  title: "Get Bank Transaction",
  description: "Get a single bank transaction by id.",
  params: [
    { key: "bankTransactionId", label: "Bank Transaction ID", type: "string", required: true },
  ],
  output: [{ key: "bank_transaction", type: "object", label: "Bank transaction" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/bank_transactions/${input.bankTransactionId}`);
  },
};

export default bankTransactionGet;
