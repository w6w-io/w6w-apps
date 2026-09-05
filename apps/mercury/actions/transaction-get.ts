import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { transactionIdParam } from "../lib/params.ts";

/**
 * `GET /transaction/{transactionId}` — a single transaction, with
 * attachments, check images, and related metadata. `operationId:
 * getTransactionById`.
 */
interface Input {
  transactionId: string;
}

const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Retrieve a single transaction by ID, including attachments and check images.",
  params: [transactionIdParam],
  output: [{ key: "transaction", type: "object", label: "Transaction" }],

  async execute(input, ctx) {
    const transaction = await new MercuryClient(ctx).json(
      `/transaction/${encodeURIComponent(input.transactionId)}`,
    );
    return { transaction };
  },
};

export default transactionGet;
