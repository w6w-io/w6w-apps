import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";

interface Input {
  expenseId: string;
  fields: unknown;
}

const expenseUpdate: ActionDefinition<Input> = {
  key: "expense-update",
  type: "perform",
  resource: "expense",
  title: "Update Expense",
  description: "Update an existing expense's fields.",
  // PUTting the same field set twice converges on the same record.
  idempotent: true,
  params: [
    { key: "expenseId", label: "Expense ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        'Object of FreshBooks expense field names -> values, e.g. { "vendor": "Acme Supplies" }.',
    },
  ],
  output: [{ key: "expense", type: "object", label: "Expense" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/expenses/expenses/${encodeURIComponent(input.expenseId)}`,
      { method: "PUT", body: { expense: jsonObject(input.fields, "fields") } },
    );
  },
};

export default expenseUpdate;
