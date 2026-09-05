import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

/**
 * `POST /transfer` — "Create an internal transfer" between two accounts
 * **in the same organization**. `operationId: createInternalTransfer`.
 *
 * Distinct from `transaction-send`: this moves money between the caller's
 * own Mercury accounts (checking/savings/treasury/investment, per the
 * vendor's own description), never to an external recipient. Same
 * required-`idempotencyKey` shape and reasoning as `transaction-send` — see
 * that action's doc comment.
 */
interface Input {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  note?: string;
}

const transferCreate: ActionDefinition<Input> = {
  key: "transfer-create",
  type: "perform",
  resource: "transfer",
  title: "Create Internal Transfer",
  description:
    "Transfer funds between two Mercury accounts belonging to the same organization. Moves real " +
    "funds between the organization's own accounts (never to an external recipient).",
  idempotent: true,
  params: [
    {
      key: "sourceAccountId",
      label: "Source account ID",
      type: "string",
      required: true,
      hint: "A Mercury account UUID to debit.",
    },
    {
      key: "destinationAccountId",
      label: "Destination account ID",
      type: "string",
      required: true,
      hint: "A Mercury account UUID to credit — must belong to the same organization.",
    },
    {
      key: "amount",
      label: "Amount (USD)",
      type: "number",
      required: true,
      validation: { min: 0.01 },
      hint: "Positive dollar amount, at least $0.01.",
    },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [
    { key: "creditTransaction", type: "object", label: "Credit transaction (destination account)" },
    { key: "debitTransaction", type: "object", label: "Debit transaction (source account)" },
  ],

  async execute(input, ctx) {
    const result = await new MercuryClient(ctx).json<
      { creditTransaction?: unknown; debitTransaction?: unknown }
    >("/transfer", {
      method: "POST",
      body: {
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        amount: input.amount,
        idempotencyKey: ctx.invocation?.invocationId ?? crypto.randomUUID(),
        note: input.note ?? null,
      },
    });
    return {
      creditTransaction: result?.creditTransaction,
      debitTransaction: result?.debitTransaction,
    };
  },
};

export default transferCreate;
