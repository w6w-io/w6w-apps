import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/Transaction` — every field of one transaction. Read-only. */
interface Input {
  id: string;
}

const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Fetch all information for a single transaction by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The transaction" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Transaction", { query: { id: input.id } });
  },
};

export default transactionGet;
