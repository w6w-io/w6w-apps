import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { expenseOutput } from "../lib/params.ts";

interface Input {
  expenseId: string;
}

/** `GET /api/v1/expenses/{id}` — verified against `showExpense`. */
const expenseGet: ActionDefinition<Input> = {
  key: "expense-get",
  type: "read",
  resource: "expense",
  title: "Get Expense",
  description: "Retrieve a single expense by hashed ID.",
  params: [
    { key: "expenseId", label: "Expense ID", type: "string", required: true },
  ],
  output: expenseOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/expenses/${input.expenseId}`);
  },
};

export default expenseGet;
