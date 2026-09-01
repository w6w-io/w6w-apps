import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** `GET /transaction/{id}` — one transaction (donation, pledge, etc.) by id. */
const getTransaction: ActionDefinition<Input> = {
  key: "get-transaction",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Fetch a single transaction by its Bloomerang API id.",
  params: [
    { key: "id", label: "Transaction ID", type: "number", required: true },
  ],
  output: [
    { key: "Id", type: "number", label: "Transaction ID" },
    { key: "TransactionNumber", type: "number", label: "User-friendly transaction number" },
  ],

  execute(input, ctx) {
    return new BloomerangClient(ctx).request(`/transaction/${encodeURIComponent(input.id)}`);
  },
};

export default getTransaction;
